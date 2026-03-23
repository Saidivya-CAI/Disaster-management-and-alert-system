package io.reflectoring.demo.service;

import io.reflectoring.demo.dto.DisasterEventRequest;
import io.reflectoring.demo.dto.DisasterEventDTO;
import io.reflectoring.demo.controller.AdminController;
import io.reflectoring.demo.entity.*;
import io.reflectoring.demo.repository.DisasterEventRepository;
import io.reflectoring.demo.repository.ProfileRepository;
import io.reflectoring.demo.repository.RescueReportRepository;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@org.springframework.transaction.annotation.Transactional
public class DisasterEventService {

    private static final Logger log = LoggerFactory.getLogger(DisasterEventService.class);
    private final DisasterEventRepository disasterEventRepository;
    private final UserRepository userRepository;
    private final RescueTaskRepository rescueTaskRepository;
    private final ProfileRepository profileRepository;
    private final RescueReportRepository rescueReportRepository;
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
        return broadcastToCitizens(savedEvent);
    }

    @CacheEvict(value = "verifiedAlerts", allEntries = true)
    public DisasterEventDTO broadcastByAdmin(Long id, String adminEmail,
            jakarta.servlet.http.HttpServletRequest request) {
        DisasterEvent event = disasterEventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found: " + id));

        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new RuntimeException("Admin not found: " + adminEmail));

        event.setStatus(AlertStatus.ACTIVE);
        event.setVerifiedBy(admin);
        event.setVerifiedAt(LocalDateTime.now());

        if (request != null) {
            auditService.log("BROADCAST_ALERT", adminEmail, "Admin directly broadcasted event ID: " + id,
                    AuditStatus.SUCCESS, request);
        }
        log.info("Event {} directly broadcasted by admin {} → status ACTIVE", id, adminEmail);

        DisasterEvent savedEvent = disasterEventRepository.save(event);
        return broadcastToCitizens(savedEvent);
    }

    private DisasterEventDTO broadcastToCitizens(DisasterEvent event) {
        DisasterEventDTO dto = DisasterEventDTO.from(event);
        // Broadcast to citizens via WebSocket
        if (event.getRegion() != null && !event.getRegion().isBlank()) {
            String regionTopic = "/topic/alerts/" + event.getRegion().replaceAll("\\s+", "_").toLowerCase();
            messagingTemplate.convertAndSend(regionTopic, dto);
            log.info("Event {} broadcast to region specific topic {}", event.getId(), regionTopic);
        } else {
            messagingTemplate.convertAndSend("/topic/alerts", dto);
            log.info("Event {} broadcast to global citizens topic", event.getId());
        }

        // Send notifications (Email/SMS)
        notificationService.sendAlertNotification(event);
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
            String description, String emergencyType, String citizenSeverity) {
        log.info("SOS Request received from: {} at [{}, {}] type: {}, severity: {}", userEmail, latitude, longitude,
                emergencyType, citizenSeverity);

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
                .emergencyType(emergencyType)
                .citizenSeverity(citizenSeverity)
                .status(TaskStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();

        // 2. Find closest responder
        User closestResponder = null;
        double minDistance = Double.MAX_VALUE;

        if (latitude != null && longitude != null) {
            List<User> responders = userRepository.findByRole(Role.RESPONDER);
            // Optimization: Fetch all profiles for these responders at once if possible,
            // but since we have a small number, let's just ensure we handle the loop
            // better.

            for (User responder : responders) {
                // Check if responder is available (no IN_PROGRESS tasks)
                boolean isBusy = rescueTaskRepository.findByResponderId(responder.getId()).stream()
                        .anyMatch(t -> t.getStatus() == TaskStatus.IN_PROGRESS);
                if (isBusy) {
                    log.debug("Responder {} is busy, skipping.", responder.getEmail());
                    continue;
                }

                var profileOpt = profileRepository.findByUserId(responder.getId());
                if (profileOpt.isPresent()) {
                    Profile profile = profileOpt.get();
                    if (profile.getLatitude() != null && profile.getLongitude() != null) {
                        double distance = io.reflectoring.demo.util.GeoUtils.calculateDistance(
                                latitude, longitude,
                                profile.getLatitude(), profile.getLongitude());

                        if (distance < minDistance) {
                            minDistance = distance;
                            closestResponder = responder;
                        }
                    }
                }
            }
        } else {
            log.warn("SOS Request from {} missing coordinates, skipping proximity routing.", userEmail);
        }

        if (closestResponder != null) {
            task.setResponder(closestResponder);
            task.setStatus(TaskStatus.IN_PROGRESS);
            log.info("SOS Request by {} automatically routed to nearest responder: {} (Distance: {} km)",
                    userEmail, closestResponder.getEmail(), String.format("%.2f", minDistance));
        } else {
            task.setStatus(TaskStatus.PENDING);
            log.info("SOS Request by {} has no available nearby responder. Setting as PENDING.", userEmail);
        }

        RescueTask savedTask = rescueTaskRepository.save(task);

        // Notify Admin and Responders via WebSocket
        Map<String, Object> sosNotification = Map.of(
                "type", "NEW_SOS",
                "taskId", savedTask.getId(),
                "citizenEmail", userEmail,
                "message", closestResponder != null
                        ? "Emergency automatically assigned to " + closestResponder.getEmail()
                        : "New emergency SOS request received! Needs assignment.",
                "description", savedTask.getDescription(),
                "latitude", latitude != null ? latitude : 0.0,
                "longitude", longitude != null ? longitude : 0.0);

        messagingTemplate.convertAndSend("/topic/admin-tasks", sosNotification);

        if (closestResponder != null) {
            // Notify specific responder
            messagingTemplate.convertAndSendToUser(
                    closestResponder.getEmail(),
                    "/queue/responder-tasks",
                    sosNotification);
            notificationService.sendTaskAssignmentNotification(closestResponder.getEmail(), savedTask.getDescription());

            // Notify citizen via WebSocket that help is found
            messagingTemplate.convertAndSend("/topic/citizen-sos-status", Map.of(
                    "taskId", savedTask.getId(),
                    "status", "RESPONDER_ASSIGNED",
                    "message", "Help is on the way! Responder " + closestResponder.getEmail() + " has been assigned."));
        } else {
            // Broadcast to all responders so someone can claim it
            messagingTemplate.convertAndSend("/topic/responder-tasks", sosNotification);

            // Notify citizen that we're looking
            messagingTemplate.convertAndSend("/topic/citizen-sos-status", Map.of(
                    "taskId", savedTask.getId(),
                    "status", "PENDING",
                    "message", "We've received your SOS. Looking for the nearest available responder."));
        }
    }

    public RescueTask investigateRescueTask(Long id, String adminEmail) {
        RescueTask task = rescueTaskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rescue Task not found: " + id));

        if (task.getStatus() == TaskStatus.PENDING) {
            task.setStatus(TaskStatus.IN_PROGRESS);
            log.info("Rescue Task {} status updated to IN_PROGRESS for investigation by {}", id, adminEmail);
            return rescueTaskRepository.save(task);
        }
        return task;
    }

    public RescueTask approveRescueTask(Long id, SeverityLevel priority, String adminEmail) {
        RescueTask task = rescueTaskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rescue Task not found: " + id));

        User admin = userRepository.findByEmail(adminEmail)
                .orElseGet(() -> userRepository.findAll().stream()
                        .filter(u -> u.getRole() == Role.ADMIN)
                        .findFirst()
                        .orElseThrow(() -> new RuntimeException("Admin not found: " + adminEmail)));

        task.setStatus(TaskStatus.VERIFIED);
        task.setPriority(priority);
        task.setVerifiedBy(admin);
        task.setVerifiedAt(LocalDateTime.now());

        RescueTask savedTask = rescueTaskRepository.save(task);

        // Always notify responders for verified tasks
        Map<String, Object> taskNotification = new HashMap<>();
        taskNotification.put("type", "TASK_VERIFIED");
        taskNotification.put("taskId", id);
        taskNotification.put("priority", priority.name());
        taskNotification.put("description", task.getDescription() != null ? task.getDescription() : "Rescue task");
        messagingTemplate.convertAndSend("/topic/responder-tasks", taskNotification);
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

    public void notifyCitizenFromResponder(Long taskId, String responderEmail, String message) {
        RescueTask task = rescueTaskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found: " + taskId));

        if (task.getCitizen() != null) {
            java.util.Map<String, Object> messageData = new java.util.HashMap<>();
            messageData.put("taskId", taskId);
            messageData.put("status", "RESPONDER_ASSIGNED");
            messageData.put("message",
                    message != null ? message : "A responder has acknowledged your request and is on the way.");
            messageData.put("responderEmail", responderEmail);

            messagingTemplate.convertAndSend("/topic/citizen-sos-status", messageData);

            notificationService.sendResponderToCitizenNotification(
                    task.getCitizen().getEmail(),
                    responderEmail,
                    message);

            log.info("Citizen {} notified by responder {} for task {}.", task.getCitizen().getEmail(), responderEmail,
                    taskId);
        }
    }

    public List<RescueTask> getTasksForResponder(Long responderId) {
        return rescueTaskRepository.findByResponderId(responderId);
    }

    public RescueTask updateTaskStatus(Long taskId, TaskStatus status) {
        RescueTask task = rescueTaskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found: " + taskId));
        task.setStatus(status);
        if (status == TaskStatus.COMPLETED) {
            task.setResolvedAt(LocalDateTime.now());
        }
        return rescueTaskRepository.save(task);

    }

    public RescueTask acknowledgeTask(Long taskId, String responderEmail) {
        RescueTask task = rescueTaskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found: " + taskId));

        User responder = userRepository.findByEmail(responderEmail)
                .orElseThrow(() -> new RuntimeException("Responder not found: " + responderEmail));

        if (task.getResponder() == null) {
            task.setResponder(responder);
            log.info("Task {} automatically assigned to responder {} during acknowledgment.", taskId, responderEmail);
        } else if (!task.getResponder().getId().equals(responder.getId())) {
            throw new RuntimeException("Responder is not assigned to this task");
        }

        task.setAcknowledged(true);
        task.setAcknowledgedAt(LocalDateTime.now());

        if (task.getStatus() == TaskStatus.PENDING || task.getStatus() == TaskStatus.VERIFIED) {
            task.setStatus(TaskStatus.IN_PROGRESS);
            log.info("Task {} transitioned to IN_PROGRESS via responder acknowledgment (from {}).", taskId,
                    task.getStatus());
        }

        log.info("Responder {} acknowledged task {} at {}", responderEmail, taskId, task.getAcknowledgedAt());
        return rescueTaskRepository.save(task);
    }

    public RescueTask assignTask(String description, String taskDescription, Long responderId, String locationName,
            Double latitude,
            Double longitude, String adminEmail) {
        User responder = userRepository.findById(responderId)
                .orElseThrow(() -> new RuntimeException("Responder not found: " + responderId));

        User admin = userRepository.findByEmail(adminEmail)
                .orElse(null);
        if (responder.getRole() != Role.RESPONDER) {
            log.warn("[TASK] User {} (ID: {}) is not a registered responder. Role: {}", responder.getEmail(), responderId, responder.getRole());
            throw new RuntimeException("Selected user '" + responder.getEmail() + "' is not a registered responder. Role found: " + responder.getRole());
        }

        RescueTask task = RescueTask.builder()
                .description(description)
                .taskDescription(taskDescription)
                .responder(responder)
                .status(TaskStatus.PENDING)
                .locationName(locationName)
                .latitude(latitude)
                .longitude(longitude)
                .verifiedBy(admin)
                .verifiedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();

        RescueTask savedTask = rescueTaskRepository.save(task);

        // Notify Responder and Admin via WebSocket
        Map<String, Object> taskNotification = new HashMap<>();
        taskNotification.put("type", "TASK_ASSIGNED");
        taskNotification.put("taskId", savedTask.getId());
        taskNotification.put("description", savedTask.getDescription());
        taskNotification.put("message", "A new rescue task has been manually assigned to you.");
        taskNotification.put("latitude", savedTask.getLatitude() != null ? savedTask.getLatitude() : 0.0);
        taskNotification.put("longitude", savedTask.getLongitude() != null ? savedTask.getLongitude() : 0.0);
        taskNotification.put("status", savedTask.getStatus().name());

        messagingTemplate.convertAndSendToUser(
                responder.getEmail(),
                "/queue/responder-tasks",
                taskNotification);

        messagingTemplate.convertAndSend("/topic/admin-tasks", taskNotification);

        // Notify Responder via Email/SMS log
        notificationService.sendTaskAssignmentNotification(responder.getEmail(), description);

        return savedTask;
    }

    public RescueTask assignResponderToTask(Long taskId, Long responderId, String adminEmail) {
        RescueTask task = rescueTaskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Rescue Task not found: " + taskId));

        User responder = userRepository.findById(responderId)
                .orElseThrow(() -> new RuntimeException("Responder not found: " + responderId));

        User admin = userRepository.findByEmail(adminEmail)
                .orElseGet(() -> userRepository.findAll().stream()
                        .filter(u -> u.getRole() == Role.ADMIN)
                        .findFirst()
                        .orElseThrow(() -> new RuntimeException("Admin not found: " + adminEmail)));

        if (responder.getRole() != Role.RESPONDER) {
            throw new RuntimeException("User is not a responder");
        }

        task.setResponder(responder);
        task.setStatus(TaskStatus.VERIFIED);
        task.setVerifiedBy(admin);
        task.setVerifiedAt(LocalDateTime.now());

        RescueTask savedTask = rescueTaskRepository.save(task);

        // Notify Responder
        Map<String, Object> assignmentNotification = Map.of(
                "type", "TASK_ASSIGNED",
                "taskId", savedTask.getId(),
                "description", savedTask.getDescription(),
                "message", "A new emergency task has been manually assigned to you by admin.");

        messagingTemplate.convertAndSendToUser(
                responder.getEmail(),
                "/queue/responder-tasks",
                assignmentNotification);
        notificationService.sendTaskAssignmentNotification(responder.getEmail(), savedTask.getDescription());

        // Notify Citizen
        if (task.getCitizen() != null) {
            messagingTemplate.convertAndSend("/topic/citizen-sos-status", Map.of(
                    "taskId", savedTask.getId(),
                    "status", "RESPONDER_ASSIGNED",
                    "message", "A rescue team has been assigned: " + responder.getEmail()));
        }

        return savedTask;
    }

    public DisasterEventDTO createManualAlert(DisasterEventRequest request) {
        log.info("Creating manual disaster alert: title={}, type={}", request.getTitle(), request.getDisasterType());

        try {
            // 1. Safe parsing of fields
            String title = (request.getTitle() == null || request.getTitle().isBlank()) ? "Emergency Alert"
                    : request.getTitle();
            String description = request.getDescription();
            if (description == null || description.isBlank()) {
                description = request.getMessage() != null ? request.getMessage() : "No message provided.";
            }
            String region = (request.getRegion() == null) ? "Global" : request.getRegion();
            String location = (request.getLocationName() == null) ? "Various" : request.getLocationName();

            // 2. Safe enum parsing
            DisasterType type = DisasterType.OTHER;
            if (request.getDisasterType() != null) {
                try {
                    type = DisasterType.valueOf(request.getDisasterType().toUpperCase().replace(" ", "_"));
                } catch (Exception e) {
                    log.warn("Invalid disaster type: {}. Defaulting to OTHER.", request.getDisasterType());
                }
            }

            SeverityLevel severity = SeverityLevel.MEDIUM;
            if (request.getSeverity() != null) {
                try {
                    severity = SeverityLevel.valueOf(request.getSeverity().toUpperCase());
                } catch (Exception e) {
                    log.warn("Invalid severity level: {}. Defaulting to MEDIUM.", request.getSeverity());
                }
            }

            // 3. Entity construction
            DisasterEvent event = DisasterEvent.builder()
                    .title(title)
                    .description(description)
                    .region(region)
                    .locationName(location)
                    .disasterType(type)
                    .severity(severity)
                    .status(AlertStatus.ACTIVE)
                    .source("MANUAL")
                    .createdAt(LocalDateTime.now())
                    .eventTime(LocalDateTime.now())
                    .build();

            log.info("Saving disaster event to database...");
            DisasterEvent savedEvent = disasterEventRepository.save(event);
            log.info("Disaster event saved with ID: {}", savedEvent.getId());

            // 4. Safe broadcast
            try {
                return broadcastToCitizens(savedEvent);
            } catch (Exception e) {
                log.error("Failed to broadcast alert after saving: {}", e.getMessage(), e);
                // Return the DTO even if broadcast fails, so the user sees success (it is
                // saved)
                return DisasterEventDTO.from(savedEvent);
            }
        } catch (Exception e) {
            log.error("CRITICAL ERROR in createManualAlert: {}", e.getMessage(), e);
            throw new RuntimeException("Unexpected error creating alert: " + e.getMessage());
        }
    }

    public RescueReport submitRescueReport(Long taskId, String responderEmail, String statusUpdate, String imageUrls,
            Boolean markAsCompleted) {
        RescueTask task = rescueTaskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found: " + taskId));

        User responder = userRepository.findByEmail(responderEmail)
                .orElseThrow(() -> new RuntimeException("Responder not found: " + responderEmail));

        if (task.getResponder() == null) {
            task.setResponder(responder);
            log.info("Task {} automatically assigned to responder {} during report submission.", taskId,
                    responderEmail);
        } else if (!task.getResponder().getId().equals(responder.getId())) {
            throw new RuntimeException("Responder is not assigned to this task");
        }

        RescueReport report = RescueReport.builder()
                .rescueTask(task)
                .responder(responder)
                .statusUpdate(statusUpdate)
                .imageUrls(imageUrls)
                .timestamp(LocalDateTime.now())
                .build();

        RescueReport savedReport = rescueReportRepository.save(report);
        log.info("Successfully saved report ID: {} for task ID: {}", savedReport.getId(), taskId);

        task.setReportSubmitted(true);
        if (Boolean.TRUE.equals(markAsCompleted)) {
            task.setStatus(TaskStatus.COMPLETED);
            task.setResolvedAt(LocalDateTime.now());
            log.info("Task {} marked as COMPLETED via final report by responder {}.", taskId, responderEmail);
        }

        rescueTaskRepository.save(task);

        return savedReport;
    }

    public List<RescueReport> getReportsByTaskId(Long taskId) {
        log.info("Fetching reports for task ID: {}", taskId);
        List<RescueReport> reports = rescueReportRepository.findByRescueTaskIdOrderByTimestampDesc(taskId);
        log.info("Found {} reports for task ID {} in service.", reports.size(), taskId);
        return reports;
    }

    public void resolveEvent(Long id) {
        DisasterEvent event = disasterEventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found: " + id));
        event.setStatus(AlertStatus.RESOLVED);
        event.setResolvedAt(LocalDateTime.now());
        disasterEventRepository.save(event);
        log.info("Disaster event {} marked as RESOLVED", id);
    }


    public Map<String, Object> getMapData() {
        List<RescueTask> activeTasks = rescueTaskRepository.findAll().stream()
                .filter(t -> t.getStatus() != TaskStatus.COMPLETED &&
                        t.getStatus() != TaskStatus.REJECTED &&
                        t.getStatus() != TaskStatus.FAILED)
                .collect(Collectors.toList());

        List<DisasterEvent> activeEvents = disasterEventRepository.findByStatusIn(
                List.of(AlertStatus.VERIFIED, AlertStatus.ACTIVE, AlertStatus.SENT_TO_RESPONDER,
                        AlertStatus.AUTO_ESCALATED));

        List<User> responders = userRepository.findByRole(Role.RESPONDER);
        java.util.List<Map<String, Object>> responderLocations = new java.util.ArrayList<>();
        for (User r : responders) {
            profileRepository.findByUserId(r.getId()).ifPresent(p -> {
                if (p.getLatitude() != null && p.getLongitude() != null) {
                    Map<String, Object> loc = new HashMap<>();
                    loc.put("email", r.getEmail());
                    loc.put("latitude", p.getLatitude());
                    loc.put("longitude", p.getLongitude());
                    responderLocations.add(loc);
                }
            });
        }

        Map<String, Object> data = new HashMap<>();
        data.put("tasks", activeTasks.stream().map(AdminController.RescueTaskDTO::from).collect(Collectors.toList()));
        data.put("events", activeEvents.stream().map(io.reflectoring.demo.dto.DisasterEventDTO::from)
                .collect(Collectors.toList()));
        data.put("responders", responderLocations);
        return data;
    }
}
