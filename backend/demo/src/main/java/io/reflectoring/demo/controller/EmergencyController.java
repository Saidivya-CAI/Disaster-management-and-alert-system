package io.reflectoring.demo.controller;

import io.reflectoring.demo.entity.EmergencyRequest;
import io.reflectoring.demo.service.EmergencyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class EmergencyController {

    private final EmergencyService svc;

    @PreAuthorize("hasRole('CITIZEN')")
    @PostMapping("/citizen/emergency")
    public ResponseEntity<EmergencyRequest> create(
            @Valid @RequestBody EmergencyRequest req) {
        return ResponseEntity.ok(svc.create(req));
    }
}
