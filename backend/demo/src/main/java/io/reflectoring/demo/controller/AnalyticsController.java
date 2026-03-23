package io.reflectoring.demo.controller;

import io.reflectoring.demo.dto.MonthlyDisasterStats;
import io.reflectoring.demo.dto.NotificationStats;
import io.reflectoring.demo.dto.RegionalPerformanceStats;
import io.reflectoring.demo.dto.ResponderPerformanceStats;
import io.reflectoring.demo.dto.RiskAreaStats;
import io.reflectoring.demo.dto.SummaryStats;
import io.reflectoring.demo.entity.DisasterType;
import io.reflectoring.demo.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/analytics")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/disaster-stats")
    public ResponseEntity<?> getMonthlyDisasterStats() {
        return ResponseEntity.ok(analyticsService.getMonthlyDisasterStats());
    }

    @GetMapping("/regional-performance")
    public ResponseEntity<?> getRegionalPerformanceStats() {
        return ResponseEntity.ok(analyticsService.getRegionalPerformanceStats());
    }

    @GetMapping("/responder-performance")
    public ResponseEntity<?> getResponderPerformance() {
        return ResponseEntity.ok(analyticsService.getResponderPerformance());
    }

    @GetMapping("/risk-areas")
    public ResponseEntity<?> getHighRiskAreas() {
        return ResponseEntity.ok(analyticsService.getHighRiskAreas());
    }

    @GetMapping("/notification-stats")
    public ResponseEntity<?> getNotificationStats() {
        return ResponseEntity.ok(analyticsService.getNotificationStats());
    }

    @GetMapping("/summary")
    public ResponseEntity<SummaryStats> getSummaryStats() {
        return ResponseEntity.ok(analyticsService.getSummaryStats());
    }

    @GetMapping("/disaster-distribution")
    public ResponseEntity<?> getDisasterTypeDistribution() {
        return ResponseEntity.ok(analyticsService.getDisasterTypeDistribution());
    }
}
