package io.reflectoring.demo.controller;

import io.reflectoring.demo.entity.AlertAcknowledgment;
import io.reflectoring.demo.entity.AckStatus;
import io.reflectoring.demo.service.AlertAckService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AlertAckController {

    private final AlertAckService service;

    @PreAuthorize("hasRole('RESPONDER')")
    @PostMapping("/responder/alerts/{alertId}/acknowledge")
    public ResponseEntity<AlertAcknowledgment> ack(
            @PathVariable Long alertId,
            @RequestParam Long responderId,
            @RequestParam AckStatus status) {
        return ResponseEntity.ok(service.acknowledge(alertId, responderId, status));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin/alerts/{alertId}/acknowledgments")
    public ResponseEntity<List<AlertAcknowledgment>> logs(@PathVariable Long alertId) {
        return ResponseEntity.ok(service.forAlert(alertId));
    }
}
