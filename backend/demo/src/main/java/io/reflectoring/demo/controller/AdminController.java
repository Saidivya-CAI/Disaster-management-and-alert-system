package io.reflectoring.demo.controller;

import io.reflectoring.demo.dto.DisasterEventDTO;
import io.reflectoring.demo.dto.DisasterEventRequest;
import io.reflectoring.demo.entity.*;
import io.reflectoring.demo.repository.DisasterEventRepository;
import io.reflectoring.demo.repository.RescueTaskRepository;
import io.reflectoring.demo.repository.UserRepository;
import io.reflectoring.demo.service.DisasterEventService;
import io.reflectoring.demo.service.NotificationService;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')") // ensure only admins may hit any of the controller methods
public class AdminController {

    private static final Logger log = LoggerFactory.getLogger(AdminController.class);

    private final DisasterEventService disasterEventService;
    private final DisasterEventRepository disasterEventRepository;
    private final RescueTaskRepository rescueTaskRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;

    @GetMapping("/diagnostics")
    public ResponseEntity<Map<String, Object>> getDiagnostics(java.security.Principal principal) {
        Map<String, Object> debug = new HashMap<>();
        debug.put("principal", principal != null ? principal.getName() : "null");
        if (principal instanceof org.springframework.security.authentication.UsernamePasswordAuthenticationToken auth) {
            debug.put("authorities", auth.getAuthorities());
            debug.put("authenticated", auth.isAuthenticated());
        }
        return ResponseEntity.ok(debug);
    }

    /**
     * Create a manual disaster alert.
     * CRITICAL alerts are auto-broadcast to citizens immediately (status = ACTIVE).
     * Non-critical alerts go to admin verification queue (status =
     * PENDING_VERIFICATION).
     */
    @PostMapping("/alerts")
    public ResponseEntity<?> createAlert(@RequestBody CreateAlertRequest req) {
        log.info("[CONTROLLER_DEBUG] Received createAlert request: {}", req);
        try {
            DisasterEventRequest serviceReq = new DisasterEventRequest();
            serviceReq.setTitle(req.getTitle());
            serviceReq.setDescription(req.getDescription());
            serviceReq.setRegion(req.getRegion());
            serviceReq.setLocationName(req.getLocationName());
            serviceReq.setDisasterType(req.getDisasterType());
            serviceReq.setSeverity(req.getSeverity());

            DisasterEventDTO result = disasterEventService.createManualAlert(serviceReq);
            log.info("[CONTROLLER_DEBUG] Alert created successfully");
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("[CONTROLLER_DEBUG] Error in createAlert: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to create alert: " + e.getMessage()));
        }
    }

    /** Get all alerts (any status) */
    @GetMapping("/alerts")
    public ResponseEntity<List<DisasterEventDTO>> getAllAlerts() {
        return ResponseEntity.ok(
                disasterEventService.getAllEvents().stream()
                        .map(DisasterEventDTO::from)
                        .collect(Collectors.toList()));
    }

    /** Get pending alerts */
    @GetMapping("/alerts/pending")
    public ResponseEntity<List<DisasterEventDTO>> getPendingAlerts() {
        return ResponseEntity.ok(
                disasterEventService.getPendingEvents().stream()
                        .map(DisasterEventDTO::from)
                        .collect(Collectors.toList()));
    }

    /** Approve alert */
    @PutMapping("/alerts/{id}/approve")
    public ResponseEntity<DisasterEventDTO> approveAlert(
            @PathVariable Long id,
            jakarta.servlet.http.HttpServletRequest request,
            java.security.Principal principal) {
        String adminEmail = principal != null ? principal.getName() : "admin";
        return ResponseEntity.ok(disasterEventService.approveEvent(id, adminEmail, request));
    }

    /** Reject alert */
    @PutMapping("/alerts/{id}/reject")
    public ResponseEntity<DisasterEventDTO> rejectAlert(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            jakarta.servlet.http.HttpServletRequest request,
            java.security.Principal principal) {
        String adminEmail = principal != null ? principal.getName() : "admin";
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(disasterEventService.rejectEvent(id, adminEmail, reason, request));
    }

    // ─── Rescue Tasks ────────────────────────────────────────────────────────

    /** Get all rescue tasks */
    @GetMapping("/tasks")
    public ResponseEntity<List<RescueTaskDTO>> getAllTasks() {
        return ResponseEntity.ok(
                rescueTaskRepository.findAll().stream()
                        .map(RescueTaskDTO::from)
                        .collect(Collectors.toList()));
    }

    /** Assign a rescue task to a responder */
    @PostMapping("/tasks")
    public ResponseEntity<?> assignTask(@RequestBody AssignTaskRequest req,
            java.security.Principal principal) {
        String adminEmail = principal != null ? principal.getName() : "admin";
        log.info("[ADMIN] manual task assignment by {}: {}", adminEmail, req);
        try {
            RescueTask task = disasterEventService.assignTask(req.getDescription(), req.getTaskDescription(),
                    req.getResponderId(),
                    req.getLocationName(), req.getLatitude(), req.getLongitude(), adminEmail);
            return ResponseEntity.ok(RescueTaskDTO.from(task));
        } catch (Exception e) {
            log.error("[ADMIN] Error assigning task: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to assign task: " + e.getMessage()));
        }
    }

    /** Get geodata for map visualization */
    @GetMapping("/map-data")
    public ResponseEntity<Map<String, Object>> getMapData() {
        return ResponseEntity.ok(disasterEventService.getMapData());
    }

    // ─── Responders ──────────────────────────────────────────────────────────

    /** Get all responders */
    @GetMapping("/responders")
    public ResponseEntity<List<UserDTO>> getAllResponders() {
        return ResponseEntity.ok(
                userRepository.findAll().stream()
                        .filter(u -> u.getRole() == Role.RESPONDER)
                        .map(UserDTO::from)
                        .collect(Collectors.toList()));
    }

    /** Get all users */
    @GetMapping("/users")
    public ResponseEntity<List<UserDTO>> getAllUsers() {
        return ResponseEntity.ok(
                userRepository.findAll().stream()
                        .map(UserDTO::from)
                        .collect(Collectors.toList()));
    }

    // ─── DTOs ────────────────────────────────────────────────────────────────

    public static class CreateAlertRequest {
        private String title;
        private String description;
        private String disasterType;
        private String severity;
        private String region;
        private String locationName;

        public CreateAlertRequest() {}

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public String getDisasterType() { return disasterType; }
        public void setDisasterType(String disasterType) { this.disasterType = disasterType; }
        public String getSeverity() { return severity; }
        public void setSeverity(String severity) { this.severity = severity; }
        public String getRegion() { return region; }
        public void setRegion(String region) { this.region = region; }
        public String getLocationName() { return locationName; }
        public void setLocationName(String locationName) { this.locationName = locationName; }
    }

    public static class AssignTaskRequest {
        private String description;
        private String taskDescription;
        private Long responderId;
        private String locationName;
        private Double latitude;
        private Double longitude;

        public AssignTaskRequest() {}

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public String getTaskDescription() { return taskDescription; }
        public void setTaskDescription(String taskDescription) { this.taskDescription = taskDescription; }
        public Long getResponderId() { return responderId; }
        public void setResponderId(Long responderId) { this.responderId = responderId; }
        public String getLocationName() { return locationName; }
        public void setLocationName(String locationName) { this.locationName = locationName; }
        public Double getLatitude() { return latitude; }
        public void setLatitude(Double latitude) { this.latitude = latitude; }
        public Double getLongitude() { return longitude; }
        public void setLongitude(Double longitude) { this.longitude = longitude; }
    }

    public static class RescueTaskDTO {
        private Long id;
        private String description;
        private String taskDescription;
        private String status;
        private String priority;
        private String responderEmail;
        private Long responderId;
        private Long citizenId;
        private String citizenEmail;
        private String createdAt;
        private String verifiedAt;
        private String verifiedByEmail;
        private String locationName;
        private Double latitude;
        private Double longitude;
        private Boolean acknowledged;
        private String acknowledgedAt;
        private String emergencyType;
        private String citizenSeverity;
        private Boolean reportSubmitted;

        public RescueTaskDTO() {}

        // Getters and Setters
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public String getTaskDescription() { return taskDescription; }
        public void setTaskDescription(String taskDescription) { this.taskDescription = taskDescription; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public String getPriority() { return priority; }
        public void setPriority(String priority) { this.priority = priority; }
        public String getResponderEmail() { return responderEmail; }
        public void setResponderEmail(String responderEmail) { this.responderEmail = responderEmail; }
        public Long getResponderId() { return responderId; }
        public void setResponderId(Long responderId) { this.responderId = responderId; }
        public Long getCitizenId() { return citizenId; }
        public void setCitizenId(Long citizenId) { this.citizenId = citizenId; }
        public String getCitizenEmail() { return citizenEmail; }
        public void setCitizenEmail(String citizenEmail) { this.citizenEmail = citizenEmail; }
        public String getCreatedAt() { return createdAt; }
        public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
        public String getVerifiedAt() { return verifiedAt; }
        public void setVerifiedAt(String verifiedAt) { this.verifiedAt = verifiedAt; }
        public String getVerifiedByEmail() { return verifiedByEmail; }
        public void setVerifiedByEmail(String verifiedByEmail) { this.verifiedByEmail = verifiedByEmail; }
        public String getLocationName() { return locationName; }
        public void setLocationName(String locationName) { this.locationName = locationName; }
        public Double getLatitude() { return latitude; }
        public void setLatitude(Double latitude) { this.latitude = latitude; }
        public Double getLongitude() { return longitude; }
        public void setLongitude(Double longitude) { this.longitude = longitude; }
        public Boolean getAcknowledged() { return acknowledged; }
        public void setAcknowledged(Boolean acknowledged) { this.acknowledged = acknowledged; }
        public String getAcknowledgedAt() { return acknowledgedAt; }
        public void setAcknowledgedAt(String acknowledgedAt) { this.acknowledgedAt = acknowledgedAt; }
        public String getEmergencyType() { return emergencyType; }
        public void setEmergencyType(String emergencyType) { this.emergencyType = emergencyType; }
        public String getCitizenSeverity() { return citizenSeverity; }
        public void setCitizenSeverity(String citizenSeverity) { this.citizenSeverity = citizenSeverity; }
        public Boolean getReportSubmitted() { return reportSubmitted; }
        public void setReportSubmitted(Boolean reportSubmitted) { this.reportSubmitted = reportSubmitted; }

        public static RescueTaskDTO from(RescueTask t) {
            RescueTaskDTO dto = new RescueTaskDTO();
            dto.id = t.getId();
            dto.description = t.getDescription();
            dto.taskDescription = t.getTaskDescription();
            dto.status = t.getStatus().name();
            dto.priority = t.getPriority() != null ? t.getPriority().name() : null;
            dto.createdAt = t.getCreatedAt() != null ? t.getCreatedAt().toString() : null;
            dto.verifiedAt = t.getVerifiedAt() != null ? t.getVerifiedAt().toString() : null;
            if (t.getVerifiedBy() != null) {
                dto.verifiedByEmail = t.getVerifiedBy().getEmail();
            }
            if (t.getResponder() != null) {
                dto.responderEmail = t.getResponder().getEmail();
                dto.responderId = t.getResponder().getId();
            }
            if (t.getCitizen() != null) {
                dto.citizenId = t.getCitizen().getId();
                dto.citizenEmail = t.getCitizen().getEmail();
            }
            dto.locationName = t.getLocationName();
            dto.latitude = t.getLatitude();
            dto.longitude = t.getLongitude();
            dto.acknowledged = t.getAcknowledged();
            dto.acknowledgedAt = t.getAcknowledgedAt() != null ? t.getAcknowledgedAt().toString() : null;
            dto.emergencyType = t.getEmergencyType();
            dto.citizenSeverity = t.getCitizenSeverity();
            dto.reportSubmitted = t.getReportSubmitted();
            return dto;
        }
    }

    @PutMapping("/tasks/{id}/approve")
    public ResponseEntity<?> approveTask(
            @PathVariable Long id,
            @RequestParam String priority,
            java.security.Principal principal) {
        String adminEmail = principal != null ? principal.getName() : "admin";

        if (principal instanceof org.springframework.security.authentication.UsernamePasswordAuthenticationToken auth) {
            log.info("Admin {} authorities: {}", adminEmail, auth.getAuthorities());
        }

        log.info("Admin {} APPROVING rescue task {} with priority string: {}", adminEmail, id, priority);
        try {
            SeverityLevel level = SeverityLevel.valueOf(priority.toUpperCase());
            RescueTask task = disasterEventService.approveRescueTask(id, level, adminEmail);
            log.info("Rescue task {} approved successfully", id);
            return ResponseEntity.ok(RescueTaskDTO.from(task));
        } catch (IllegalArgumentException e) {
            log.error("Invalid priority level {}: {}", priority, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid priority: " + priority));
        } catch (Exception e) {
            log.error("Error approving rescue task {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to approve task: " + e.getMessage()));
        }
    }

    @PutMapping("/tasks/{id}/investigate")
    public ResponseEntity<RescueTaskDTO> investigateTask(
            @PathVariable Long id,
            java.security.Principal principal) {
        String adminEmail = principal != null ? principal.getName() : "admin";
        log.info("Admin {} INVESTIGATING rescue task {}", adminEmail, id);
        try {
            RescueTask task = disasterEventService.investigateRescueTask(id, adminEmail);
            return ResponseEntity.ok(RescueTaskDTO.from(task));
        } catch (Exception e) {
            log.error("Error investigating rescue task {}: {}", id, e.getMessage());
            throw e;
        }
    }

    @PutMapping("/tasks/{id}/reject")
    public ResponseEntity<RescueTaskDTO> rejectTask(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            java.security.Principal principal) {
        String adminEmail = principal != null ? principal.getName() : "admin";
        String reason = body != null ? body.get("reason") : "Not a valid emergency";
        log.info("Admin {} REJECTING rescue task {} with reason: {}", adminEmail, id, reason);
        try {
            RescueTask task = disasterEventService.rejectRescueTask(id, reason, adminEmail);
            log.info("Rescue task {} rejected successfully", id);
            return ResponseEntity.ok(RescueTaskDTO.from(task));
        } catch (Exception e) {
            log.error("Error rejecting rescue task {}: {}", id, e.getMessage());
            throw e;
        }
    }

    @PutMapping("/tasks/{id}/assign")
    public ResponseEntity<RescueTaskDTO> assignResponder(
            @PathVariable Long id,
            @RequestParam Long responderId,
            java.security.Principal principal) {
        String adminEmail = principal != null ? principal.getName() : "admin";
        log.info("Admin {} ASSIGNING responder {} to task {}", adminEmail, responderId, id);
        try {
            RescueTask task = disasterEventService.assignResponderToTask(id, responderId, adminEmail);
            return ResponseEntity.ok(RescueTaskDTO.from(task));
        } catch (Exception e) {
            log.error("Error manually assigning responder to task {}: {}", id, e.getMessage());
            throw e;
        }
    }

    public static class UserDTO {
        private Long id;
        private String email;
        private String role;

        public UserDTO() {}

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }

        public static UserDTO from(User u) {
            UserDTO dto = new UserDTO();
            dto.id = u.getId();
            dto.email = u.getEmail();
            dto.role = u.getRole().name();
            return dto;
        }
    }

    public static class RescueReportDTO {
        private Long id;
        private Long taskId;
        private Long responderId;
        private String responderEmail;
        private String statusUpdate;
        private String imageUrls;
        private String timestamp;

        public RescueReportDTO() {}

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public Long getTaskId() { return taskId; }
        public void setTaskId(Long taskId) { this.taskId = taskId; }
        public Long getResponderId() { return responderId; }
        public void setResponderId(Long responderId) { this.responderId = responderId; }
        public String getResponderEmail() { return responderEmail; }
        public void setResponderEmail(String responderEmail) { this.responderEmail = responderEmail; }
        public String getStatusUpdate() { return statusUpdate; }
        public void setStatusUpdate(String statusUpdate) { this.statusUpdate = statusUpdate; }
        public String getImageUrls() { return imageUrls; }
        public void setImageUrls(String imageUrls) { this.imageUrls = imageUrls; }
        public String getTimestamp() { return timestamp; }
        public void setTimestamp(String timestamp) { this.timestamp = timestamp; }

        public static RescueReportDTO from(RescueReport r) {
            RescueReportDTO dto = new RescueReportDTO();
            dto.id = r.getId();
            dto.taskId = r.getRescueTask().getId();
            dto.responderId = r.getResponder().getId();
            dto.responderEmail = r.getResponder().getEmail();
            dto.statusUpdate = r.getStatusUpdate();
            dto.imageUrls = r.getImageUrls();
            dto.timestamp = r.getTimestamp() != null ? r.getTimestamp().toString() : null;
            return dto;
        }
    }

    /** Get reports for a specific rescue task */
    @GetMapping("/tasks/{id}/reports")
    public ResponseEntity<List<RescueReportDTO>> getTaskReports(@PathVariable Long id) {
        log.info("Admin request: Fetching reports for task ID: {}", id);
        List<RescueReport> reports = disasterEventService.getReportsByTaskId(id);
        
        if (reports.isEmpty()) {
            log.warn("No reports found in database for task ID: {}", id);
        } else {
            log.info("Successfully found {} reports for task ID: {}", reports.size(), id);
        }
        
        return ResponseEntity.ok(
                reports.stream()
                        .map(RescueReportDTO::from)
                        .collect(Collectors.toList()));
    }

    /** TEMPORARY: List all reports for debugging */
    @GetMapping("/debug/reports")
    public ResponseEntity<List<RescueReportDTO>> getAllReports() {
        return ResponseEntity.ok(
                rescueReportRepository.findAll().stream()
                        .peek(r -> log.info("DEBUG Report: ID={}, TaskID={}", r.getId(), r.getRescueTask().getId()))
                        .map(RescueReportDTO::from)
                        .collect(Collectors.toList()));
    }
}
