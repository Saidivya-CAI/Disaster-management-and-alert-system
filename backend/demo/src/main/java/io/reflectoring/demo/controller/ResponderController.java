package io.reflectoring.demo.controller;

import io.reflectoring.demo.dto.DisasterEventDTO;
import io.reflectoring.demo.entity.*;
import io.reflectoring.demo.repository.RescueTaskRepository;
import io.reflectoring.demo.repository.UserRepository;
import io.reflectoring.demo.service.DisasterEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/responder")
@RequiredArgsConstructor
@PreAuthorize("hasRole('RESPONDER') or hasRole('ADMIN')")
public class ResponderController {

    private final RescueTaskRepository rescueTaskRepository;
    private final UserRepository userRepository;
    private final DisasterEventService disasterEventService;

    /** Get tasks for responder: assigned to them OR verified and unassigned */
    @GetMapping("/tasks")
    public ResponseEntity<List<AdminController.RescueTaskDTO>> getMyTasks(Principal principal) {
        String email = principal != null ? principal.getName() : null;
        if (email == null)
            return ResponseEntity.ok(List.of());

        return userRepository.findByEmail(email).map(user -> {
            // Get already assigned tasks
            List<RescueTask> myTasks = rescueTaskRepository.findByResponderId(user.getId());

            // Also get verified tasks AND pending SOS tasks that haven't been assigned yet
            List<RescueTask> unassignedTasks = rescueTaskRepository.findByStatusAndResponderIsNull(TaskStatus.VERIFIED);
            unassignedTasks.addAll(rescueTaskRepository.findByStatusAndResponderIsNull(TaskStatus.PENDING));

            // Combine both
            myTasks.addAll(unassignedTasks);

            return ResponseEntity.ok(
                    myTasks.stream()
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

    /** Forward an alert to citizens (sets status to ACTIVE, broadcasts) */
    @PutMapping("/alerts/{id}/forward")
    public ResponseEntity<DisasterEventDTO> forwardToCitizen(@PathVariable Long id) {
        return ResponseEntity.ok(disasterEventService.forwardToCitizen(id));
    }

    /** Notify the citizen that help is on the way */
    @PostMapping("/tasks/{taskId}/notify-citizen")
    public ResponseEntity<String> notifyCitizen(@PathVariable Long taskId) {
        disasterEventService.notifyCitizenFromResponder(taskId);
        return ResponseEntity.ok("Citizen notified.");
    }
}
