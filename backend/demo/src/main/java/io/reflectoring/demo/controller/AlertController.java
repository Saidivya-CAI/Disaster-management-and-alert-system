package io.reflectoring.demo.controller;

import io.reflectoring.demo.entity.Alert;
import io.reflectoring.demo.service.AlertService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AlertController {

    private final AlertService service;

    @PreAuthorize("hasRole('ADMIN')")
    // renamed path to avoid clash with existing AdminController alerts endpoint
    @PostMapping("/admin/zone-alerts")
    public ResponseEntity<Alert> create(@Valid @RequestBody Alert alert,
                                        Principal principal) {
        alert.setCreatedBy(principal.getName());
        return ResponseEntity.ok(service.create(alert));
    }

}
