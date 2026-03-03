package io.reflectoring.demo.service;

import io.reflectoring.demo.dto.DisasterEventRequest;
import io.reflectoring.demo.dto.DisasterEventDTO;
import io.reflectoring.demo.entity.*;
import io.reflectoring.demo.repository.DisasterEventRepository;
import io.reflectoring.demo.repository.ProfileRepository;
import io.reflectoring.demo.repository.RescueTaskRepository;
import io.reflectoring.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DisasterEventService {

    private static final Logger log = LoggerFactory.getLogger(DisasterEventService.class);
    private final DisasterEventRepository disasterEventRepository;
    private final UserRepository userRepository;
    private final RescueTaskRepository rescueTaskRepository;
    private final ProfileRepository profileRepository;
    private final AuditService auditService;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;

    public List<DisasterEvent> getPendingEvents() {
        return disasterEventRepository.findByStatus(AlertStatus.PENDING_VERIFICATION);
    }

    public List<DisasterEvent> getAllEvents() {
        return disasterEventRepository.findAll();
    }

    @Cacheable("verifiedAlerts")
    public List<DisasterEvent> getPublicEvents() {
        log.debug("Loading verified alerts from DB (cache miss)");
        return disasterEventRepository.findByStatusIn(List.of(AlertStatus.VERIFIED, AlertStatus.ACTIVE));
    }

    public List<DisasterEvent> getAlertsByRegion(String region) {
        return disasterEventRepository.findByRegion(region);
    }

    /**
     * Get alerts that are ready for responder review.
     * Returns events with status SENT_TO_RESPONDER or AUTO_ESCALATED.
     */
    public List<DisasterEvent> getResponderAlerts() {
        return disasterEventRepository.findByStatusIn(
                List.of(AlertStatus.SENT_TO_RESPONDER, AlertStatus.AUTO_ESCALATED));
    }

    /**
     * Admin approves an alert → status becomes SENT_TO_RESPONDER.
     * The alert is forwarded to responders via WebSocket for their review
     * before being broadcast to citizens.
     */
    @CacheEvict(value = "verifiedAlerts", allEntries = true)
    public DisasterEventDTO approveEvent(Long id, String adminEmail, jakarta.servlet.http.HttpServletRequest request) {
        DisasterEvent event = disasterEventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found: " + id));

        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new RuntimeException("Admin not found: " + adminEmail));

        event.setStatus(AlertStatus.SENT_TO_RESPONDER);
        event.setVerifiedBy(admin);
        event.setVerifiedAt(LocalDateTime.now());

        auditService.log("APPROVE_ALERT", adminEmail, "Approved event ID: " + id, AuditStatus.SUCCESS, request);
        log.info("Event {} approved by admin {} → sent to responder", id, adminEmail);

        DisasterEvent savedEvent = disasterEventRepository.save(event);
        DisasterEventDTO dto = DisasterEventDTO.from(savedEvent);

        // Notify responders via WebSocket
        messagingTemplate.convertAndSend("/topic/responder-alerts", dto);
        log.info("Event {} forwarded to responders via /topic/responder-alerts", id);

        return dto;
    }

    /**
     * Responder forwards a verified/escalated alert to citizens.
     * Sets status to ACTIVE, broadcasts to /topic/alerts, and sends notifications.
     */
    @CacheEvict(value = "verifiedAlerts", allEntries = true)
    public DisasterEventDTO forwardToCitizen(Long id) {
        DisasterEvent event = disasterEventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found: " + id));

        if (event.getStatus() != AlertStatus.SENT_TO_RESPONDER
                && event.getStatus() != AlertStatus.AUTO_ESCALATED) {
            throw new RuntimeException("Alert is not in a forwardable state. Current status: " + event.getStatus());
        }

        event.setStatus(AlertStatus.ACTIVE);

        DisasterEvent savedEvent = disasterEventRepository.save(event);
        DisasterEventDTO dto = DisasterEventDTO.from(savedEvent);

        // Broadcast to citizens via WebSocket
        if (event.getRegion() != null && !event.getRegion().isBlank()) {
            String regionTopic = "/topic/alerts/" + event.getRegion().replaceAll("\\s+", "_").toLowerCase();
            messagingTemplate.convertAndSend(regionTopic, dto);
            log.info("Event {} forwarded to region specific topic {} by responder → status ACTIVE", id, regionTopic);
        } else {
            messagingTemplate.convertAndSend("/topic/alerts", dto);
            log.info("Event {} forwarded to global citizens by responder → status ACTIVE", id);
        }

        // Send notifications (Email/SMS)
        notificationService.sendAlertNotification(savedEvent);

        return dto;
    }

    @CacheEvict(value = "verifiedAlerts", allEntries = true)
    public DisasterEventDTO rejectEvent(Long id, String adminEmail, String reason,
            jakarta.servlet.http.HttpServletRequest request) {
        DisasterEvent event = disasterEventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found: " + id));

        event.setStatus(AlertStatus.REJECTED);
        if (reason != null && !reason.isBlank()) {
            event.setRejectionReason(reason);
        }

        auditService.log("REJECT_ALERT", adminEmail, "Rejected event ID: " + id, AuditStatus.SUCCESS, request);
        log.info("Event {} rejected by {}", id, adminEmail);

        return DisasterEventDTO.from(disasterEventRepository.save(event));
    }

    public void requestHelp(String userEmail, Double latitude, Double longitude, String locationName,
            String description) {
        User citizen = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found: " + userEmail));

        // 1. Create the task unconditionally first
        RescueTask task = RescueTask.builder()
                .description(description != null && !description.isBlank() ? description
                        : "Emergency Help Requested by " + userEmail)
                .citizen(citizen)
                .latitude(latitude)
                .longitude(longitude)
                .locationName(locationName)
                .status(TaskStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();

        // 2. Find closest responder
        User closestResponder = null;
        double minDistance = Double.MAXValue;

        if (latitude != null && longitude != null) {
            List<User> responders = userRepository.findAll().stream()
                    .filter(u -> u.getRole() == Role.RESPONDER)
                    .collect(Collectors.toList());

            for (User responder : responders) {
                profileRepository.findByUserId(responder.getId()).ifPresent(profile -> {
                    if (profile.getLatitude() != null && profile.getLongitude() != null) {
                        double distance = io.reflectoring.demo.util.GeoUtils.calculateDistance(
                                latitude, longitude,
                                profile.getLatitude(), profile.getLongitude());
                        // We use a mutable wrapper or just check/assign if we don't use streams inside
                    }
                });
            }
        }

        if (closestResponder != null) {
            task.setResponder(closestResponder);
            task.setStatus(TaskStatus.IN_PROGRESS);
            log.info("SOS Request by {} automatically routed to nearest responder: {} (Distance: {} km)",
                    userEmail, closestResponder.getEmail(), minDistance);
        } else {
            task.setStatus(TaskStatus.PENDING);
            log.info("SOS Request by {} has no nearby responder. Keeping as PENDING.", userEmail);
        }

        RescueTask savedTask = rescueTaskRepository.save(task);

        // Notify Admin and Responders via WebSocket
        Map<String, Object> sosNotification = Map.of(
                "type", "NEW_SOS",
                "taskId", savedTask.getId(),
                "citizenEmail", userEmail,
                "message", closestResponder != null
                        ? "Emergency assigned to nearest responder!"
                        : "New emergency SOS request received!",
                "description", savedTask.getDescription(),
                "latitude", latitude != null ? latitude : "",
                "longitude", longitude != null ? longitude : "");

        messagingTemplate.convertAndSend("/topic/admin-tasks", sosNotification);

        if (closestResponder != null) {
            // Notify specific responder
            messagingTemplate.convertAndSendToUser(
                    closestResponder.getEmail(),
                    "/queue/responder-tasks",
                    sosNotification);
            notificationService.sendTaskAssignmentNotification(closestResponder.getEmail(), savedTask.getDescription());
        } else {
            // Broadcast to all
            messagingTemplate.convertAndSend("/topic/responder-tasks", sosNotification);
        }
    }

    public RescueTask approveRescueTask(Long id, SeverityLevel priority, String adminEmail) {
        RescueTask task = rescueTaskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rescue Task not found: " + id));

        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new RuntimeException("Admin not found: " + adminEmail));

        task.setStatus(TaskStatus.VERIFIED);
        task.setPriority(priority);
        task.setVerifiedBy(admin);
        task.setVerifiedAt(LocalDateTime.now());

        RescueTask savedTask = rescueTaskRepository.save(task);

        // Always notify responders for verified tasks
        messagingTemplate.convertAndSend("/topic/responder-tasks", Map.of(
                "type", "TASK_VERIFIED",
                "taskId", id,
                "priority", priority,
                "description", task.getDescription()));
        log.info("Rescue Task {} approved with priority {} and sent to responders.", id, priority);

        if (priority == SeverityLevel.CRITICAL) {
            // Directly notify citizen for critical SOS
            messagingTemplate.convertAndSend("/topic/citizen-sos-status", Map.of(
                    "taskId", id,
                    "status", "VERIFIED_CRITICAL",
                    "message", "A critical rescue team is being dispatched."));
            log.info("Critical Rescue Task {} approved and citizen notified directly.", id);
        } else {
            log.info("Rescue Task {} approved (priority: {}), citizen notification awaits responder action.", id,
                    priority);
        }

        return savedTask;
    }

    public RescueTask rejectRescueTask(Long id, String reason, String adminEmail) {
        RescueTask task = rescueTaskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rescue Task not found: " + id));

        task.setStatus(TaskStatus.REJECTED);
        task.setRejectionReason(reason);

        RescueTask savedTask = rescueTaskRepository.save(task);

        // Notify citizen of rejection
        if (task.getCitizen() != null) {
            messagingTemplate.convertAndSend("/topic/citizen-sos-status", Map.of(
                    "taskId", id,
                    "status", "REJECTED",
                    "reason", reason,
                    "message", "Your SOS request was rejected: " + reason));
        }

        return savedTask;
    }

    public void notifyCitizenFromResponder(Long taskId) {
        RescueTask task = rescueTaskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found: " + taskId));

        if (task.getCitizen() != null) {
            messagingTemplate.convertAndSend("/topic/citizen-sos-status",
                    Map.of("taskId", taskId, "status", "RESPONDER_ASSIGNED", "message",
                            "A responder has acknowledged your request and is on the way."));
            log.info("Citizen notified by responder for task {}.", taskId);
        }
    }

    public List<RescueTask> getTasksForResponder(Long responderId) {
        return rescueTaskRepository.findByResponderId(responderId);
    }

    public RescueTask updateTaskStatus(Long taskId, TaskStatus status) {
        RescueTask task = rescueTaskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found: " + taskId));
        task.setStatus(status);
        return rescueTaskRepository.save(task);
    }

    public RescueTask acknowledgeTask(Long taskId, String responderEmail) {
        RescueTask task = rescueTaskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found: " + taskId));

        if (task.getResponder() == null || !task.getResponder().getEmail().equals(responderEmail)) {
            throw new RuntimeException("Responder is not assigned to this task");
        }

        task.setAcknowledged(true);
        task.setAcknowledgedAt(LocalDateTime.now());
        log.info("Responder {} acknowledged task {} at {}", responderEmail, taskId, task.getAcknowledgedAt());
        return rescueTaskRepository.save(task);
    }

    public RescueTask assignTask(String description, Long responderId, String locationName, Double latitude,
            Double longitude) {
        User responder = userRepository.findById(responderId)
                .orElseThrow(() -> new RuntimeException("Responder not found: " + responderId));

        if (responder.getRole() != Role.RESPONDER) {
            throw new RuntimeException("User is not a responder");
        }

        RescueTask task = RescueTask.builder()
                .description(description)
                .responder(responder)
                .status(TaskStatus.PENDING)
                .locationName(locationName)
                .latitude(latitude)
                .longitude(longitude)
                .createdAt(LocalDateTime.now())
                .build();

        RescueTask savedTask = rescueTaskRepository.save(task);

        // Notify Responder
        notificationService.sendTaskAssignmentNotification(responder.getEmail(), description);

        return savedTask;
    }

    public DisasterEvent createManualAlert(DisasterEventRequest request) {
        log.info("Creating manual disaster alert: {} for region: {}", request.getTitle(), request.getRegion());

        DisasterEvent event = DisasterEvent.builder()
                .title(request.getTitle())
                .description(request.getMessage())
                .region(request.getRegion())
                .disasterType(DisasterType.OTHER)
                .severity(SeverityLevel.MEDIUM)
                .status(AlertStatus.PENDING_VERIFICATION)
                .pendingSince(LocalDateTime.now())
                .source("MANUAL")
                .createdAt(LocalDateTime.now())
                .build();

        DisasterEvent savedEvent = disasterEventRepository.save(event);
        List<Profile> profilesInRegion = profileRepository.findByRegion(request.getRegion());
        log.info("Manual alert {} created for region {}. {} users in region.",
                savedEvent.getId(), request.getRegion(), profilesInRegion.size());

        return savedEvent;
    }
}
