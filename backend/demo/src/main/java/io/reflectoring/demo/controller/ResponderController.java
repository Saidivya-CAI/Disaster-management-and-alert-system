package io.reflectoring.demo.controller;

import io.reflectoring.demo.dto.DisasterEventDTO;
import io.reflectoring.demo.entity.*;
import io.reflectoring.demo.repository.RescueTaskRepository;
import io.reflectoring.demo.repository.UserRepository;
import io.reflectoring.demo.service.DisasterEventService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/responder")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('RESPONDER') or hasRole('ADMIN')")
public class ResponderController {

    private final RescueTaskRepository rescueTaskRepository;
    private final UserRepository userRepository;
    private final DisasterEventService disasterEventService;
    private final io.reflectoring.demo.repository.EmergencyRequestRepository emergencyRequestRepository;

    /** Get tasks for responder: assigned to them OR verified and unassigned */
    @GetMapping("/tasks")
    public ResponseEntity<List<AdminController.RescueTaskDTO>> getMyTasks(Principal principal) {
        String email = principal != null ? principal.getName() : null;
        if (email == null)
            return ResponseEntity.ok(List.of());

        return userRepository.findByEmail(email).map(user -> {
            // Get already assigned tasks
            List<RescueTask> assignedTasks = new ArrayList<>(rescueTaskRepository.findByResponderId(user.getId()));

            List<RescueTask> unassignedSOS = new ArrayList<>(rescueTaskRepository.findByStatusAndResponderIsNull(TaskStatus.VERIFIED));
            // Also include PENDING SOS for visibility
            unassignedSOS.addAll(rescueTaskRepository.findByStatusAndResponderIsNull(TaskStatus.PENDING));

            // Combine both
            assignedTasks.addAll(unassignedSOS);

            return ResponseEntity.ok(
                    assignedTasks.stream()
                            .distinct() // Avoid duplicates if any
                            .map(AdminController.RescueTaskDTO::from)
                            .collect(Collectors.toList()));
        }).orElse(ResponseEntity.ok(List.of()));
    }

    /** Claim a verified unassigned task */
    @PatchMapping("/tasks/{taskId}/claim")
    public ResponseEntity<AdminController.RescueTaskDTO> claimTask(
            @PathVariable Long taskId,
            Principal principal) {
        String email = principal != null ? principal.getName() : null;
        User responder = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Responder not found"));

        RescueTask task = rescueTaskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        if (task.getResponder() != null) {
            throw new RuntimeException("Task already assigned to " + task.getResponder().getEmail());
        }

        // Change status to IN_PROGRESS when responder claims it
        task.setResponder(responder);
        task.setStatus(TaskStatus.IN_PROGRESS);
        RescueTask saved = rescueTaskRepository.save(task);
        return ResponseEntity.ok(AdminController.RescueTaskDTO.from(saved));
    }

    /** Update status of a task */
    @PatchMapping("/tasks/{taskId}/status")
    public ResponseEntity<AdminController.RescueTaskDTO> updateTaskStatus(
            @PathVariable Long taskId,
            @RequestParam String status) {
        TaskStatus taskStatus = TaskStatus.valueOf(status.toUpperCase());
        RescueTask updated = disasterEventService.updateTaskStatus(taskId, taskStatus);
        return ResponseEntity.ok(AdminController.RescueTaskDTO.from(updated));
    }

    /** Acknowledge receipt of a task */
    @PatchMapping("/tasks/{taskId}/acknowledge")
    public ResponseEntity<AdminController.RescueTaskDTO> acknowledgeTask(
            @PathVariable Long taskId,
            Principal principal) {
        String email = principal != null ? principal.getName() : null;
        RescueTask updated = disasterEventService.acknowledgeTask(taskId, email);
        return ResponseEntity.ok(AdminController.RescueTaskDTO.from(updated));
    }

    /** Get alerts pending responder review (SENT_TO_RESPONDER or AUTO_ESCALATED) */
    @GetMapping("/alerts")
    public ResponseEntity<List<DisasterEventDTO>> getResponderAlerts() {
        List<DisasterEventDTO> alerts = disasterEventService.getResponderAlerts()
                .stream().map(DisasterEventDTO::from).collect(Collectors.toList());
        return ResponseEntity.ok(alerts);
    }

    // ─── Emergency request endpoints ───────────────────────────────────

    @GetMapping("/assigned-requests")
    public ResponseEntity<List<io.reflectoring.demo.entity.EmergencyRequest>> assignedRequests(
            @RequestParam Long responderId) {
        // naive filter; a full implementation would join on assignment
        List<io.reflectoring.demo.entity.EmergencyRequest> all = emergencyRequestRepository.findAll();
        List<io.reflectoring.demo.entity.EmergencyRequest> list = all.stream()
                .filter(r -> r.getStatus() == io.reflectoring.demo.entity.RequestStatus.ASSIGNED)
                .toList();
        return ResponseEntity.ok(list);
    }

    @PutMapping("/request/{id}/complete")
    public ResponseEntity<io.reflectoring.demo.entity.EmergencyRequest> completeRequest(
            @PathVariable Long id) {
        io.reflectoring.demo.entity.EmergencyRequest r = emergencyRequestRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Request not found"));
        r.setStatus(io.reflectoring.demo.entity.RequestStatus.COMPLETED);
        return ResponseEntity.ok(emergencyRequestRepository.save(r));
    }

    /** Forward an alert to citizens (sets status to ACTIVE, broadcasts) */
    @PutMapping("/alerts/{id}/forward")
    public ResponseEntity<DisasterEventDTO> forwardToCitizen(@PathVariable Long id) {
        return ResponseEntity.ok(disasterEventService.forwardToCitizen(id));
    }

    /** Notify the citizen that help is on the way */
    @PostMapping("/tasks/{taskId}/notify-citizen")
    public ResponseEntity<?> notifyCitizen(
            @PathVariable Long taskId,
            @RequestBody NotifyCitizenRequest req,
            Principal principal) {
        String responderEmail = principal != null ? principal.getName() : "Responder";
        disasterEventService.notifyCitizenFromResponder(taskId, responderEmail, req.getMessage());
        return ResponseEntity.ok(java.util.Map.of("message", "Citizen notified."));
    }

    @lombok.Data
    public static class NotifyCitizenRequest {
        private String message;
    }

    /** Submit a status report for a rescue task */
    @PostMapping("/tasks/{taskId}/report")
    public ResponseEntity<AdminController.RescueReportDTO> submitReport(
            @PathVariable Long taskId,
            @RequestBody SubmitReportRequest req,
            Principal principal) {
        String email = principal != null ? principal.getName() : null;
        log.info("Received report submission for task {} from {}. Status: {}. Images: {}",
                taskId, email, (req.getStatusUpdate() != null ? "YES" : "NO"),
                (req.getImageUrls() != null ? "YES" : "NO"));
        RescueReport report = disasterEventService.submitRescueReport(taskId, email, req.getStatusUpdate(),
                req.getImageUrls(), req.getMarkAsCompleted());
        return ResponseEntity.ok(AdminController.RescueReportDTO.from(report));
    }

    @lombok.Data
    public static class SubmitReportRequest {
        private String statusUpdate;
        private String imageUrls;
        private Boolean markAsCompleted;
    }
}
