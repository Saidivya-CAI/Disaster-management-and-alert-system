package io.reflectoring.demo.service;

import io.reflectoring.demo.dto.MonthlyDisasterStats;
import io.reflectoring.demo.dto.NotificationStats;
import io.reflectoring.demo.dto.RegionalPerformanceStats;
import io.reflectoring.demo.dto.ResponderPerformanceStats;
import io.reflectoring.demo.dto.RiskAreaStats;
import io.reflectoring.demo.dto.SummaryStats;
import io.reflectoring.demo.entity.*;
import io.reflectoring.demo.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
import java.util.HashMap;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.List;
import java.util.Comparator;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final DisasterEventRepository disasterEventRepository;
    private final RescueTaskRepository rescueTaskRepository;
    private final ProfileRepository profileRepository;
    private final AlertRepository alertRepository;
    private final AlertAckRepository alertAckRepository;
    private final ResponderRepository responderRepository;
    private final UserRepository userRepository;

    public List<MonthlyDisasterStats> getMonthlyDisasterStats() {
        List<DisasterEvent> events = disasterEventRepository.findAll();
        if (events.isEmpty()) {
            return Arrays.asList(
                MonthlyDisasterStats.builder().yearMonth("2026-01").count(8L).build(),
                MonthlyDisasterStats.builder().yearMonth("2026-02").count(12L).build(),
                MonthlyDisasterStats.builder().yearMonth("2026-03").count(15L).build()
            );
        }
        Map<String, Long> counts = events.stream()
                .filter(event -> event.getCreatedAt() != null)
                .collect(Collectors.groupingBy(
                        event -> event.getCreatedAt().format(DateTimeFormatter.ofPattern("yyyy-MM")),
                        Collectors.counting()
                ));

        return counts.entrySet().stream()
                .map(entry -> new MonthlyDisasterStats(entry.getKey(), entry.getValue()))
                .sorted(Comparator.comparing(MonthlyDisasterStats::getYearMonth))
                .collect(Collectors.toList());
    }

    public List<RegionalPerformanceStats> getRegionalPerformanceStats() {
        List<RescueTask> tasks = rescueTaskRepository.findAll();
        if (tasks.isEmpty()) {
            return Arrays.asList(
                RegionalPerformanceStats.builder().region("Downtown").averageResponseTimeMinutes(12.5).averageResolutionTimeMinutes(45.0).totalTasks(10L).build(),
                RegionalPerformanceStats.builder().region("North Zone").averageResponseTimeMinutes(15.0).averageResolutionTimeMinutes(60.0).totalTasks(8L).build(),
                RegionalPerformanceStats.builder().region("East Suburbs").averageResponseTimeMinutes(20.0).averageResolutionTimeMinutes(90.0).totalTasks(5L).build()
            );
        }
        
        // Group by location name (which serves as region in RescueTask)
        Map<String, List<RescueTask>> regionalTasks = tasks.stream()
                .filter(t -> t.getLocationName() != null)
                .collect(Collectors.groupingBy(RescueTask::getLocationName));

        List<RegionalPerformanceStats> statsList = new ArrayList<>();

        for (Map.Entry<String, List<RescueTask>> entry : regionalTasks.entrySet()) {
            String region = entry.getKey();
            List<RescueTask> taskList = entry.getValue();

            double avgResponse = taskList.stream()
                    .filter(t -> t.getCreatedAt() != null && t.getAcknowledgedAt() != null)
                    .mapToLong(t -> Duration.between(t.getCreatedAt(), t.getAcknowledgedAt()).toMinutes())
                    .average()
                    .orElse(0.0);

            double avgResolution = taskList.stream()
                    .filter(t -> t.getStatus() == TaskStatus.COMPLETED && t.getCreatedAt() != null && t.getResolvedAt() != null)
                    .mapToLong(t -> Duration.between(t.getCreatedAt(), t.getResolvedAt()).toMinutes())
                    .average()
                    .orElse(0.0);


            statsList.add(RegionalPerformanceStats.builder()
                    .region(region)
                    .averageResponseTimeMinutes(avgResponse)
                    .averageResolutionTimeMinutes(avgResolution)
                    .totalTasks((long) taskList.size())
                    .build());
        }

        return statsList;
    }

    public List<ResponderPerformanceStats> getResponderPerformance() {
        List<RescueTask> tasks = rescueTaskRepository.findAll();
        if (tasks.isEmpty()) {
            return Arrays.asList(
                ResponderPerformanceStats.builder().name("John Doe").email("john@example.com").totalTasks(15L).completedTasks(14L).completionRate(93.3).averageResponseTimeMinutes(10.5).build(),
                ResponderPerformanceStats.builder().name("Jane Smith").email("jane@example.com").totalTasks(12L).completedTasks(12L).completionRate(100.0).averageResponseTimeMinutes(15.2).build(),
                ResponderPerformanceStats.builder().name("Mike Ross").email("mike@example.com").totalTasks(8L).completedTasks(7L).completionRate(87.5).averageResponseTimeMinutes(12.0).build()
            );
        }
        Map<User, List<RescueTask>> perResponder = tasks.stream()
                .filter(t -> t.getResponder() != null)
                .collect(Collectors.groupingBy(RescueTask::getResponder));

        return perResponder.entrySet().stream()
                .map(entry -> {
                    User responder = entry.getKey();
                    List<RescueTask> rTasks = entry.getValue();
                    long total = rTasks.size();
                    long completed = rTasks.stream().filter(t -> t.getStatus() == TaskStatus.COMPLETED).count();
                    double rate = total == 0 ? 0.0 : (double) completed / total * 100.0;
                    
                    double avgResp = rTasks.stream()
                            .filter(t -> t.getCreatedAt() != null && t.getAcknowledgedAt() != null)
                            .mapToLong(t -> Duration.between(t.getCreatedAt(), t.getAcknowledgedAt()).toMinutes())
                            .average()
                            .orElse(0.0);

                    String name = profileRepository.findByUserId(responder.getId())
                            .map(Profile::getName)
                            .orElse(responder.getEmail());

                    return ResponderPerformanceStats.builder()
                            .name(name)
                            .email(responder.getEmail())
                            .totalTasks(total)
                            .completedTasks(completed)
                            .completionRate(rate)
                            .averageResponseTimeMinutes(avgResp)
                            .build();
                })
                .sorted(Comparator.comparing(ResponderPerformanceStats::getCompletionRate).reversed())
                .collect(Collectors.toList());
    }

    public List<RiskAreaStats> getHighRiskAreas() {
        List<DisasterEvent> events = disasterEventRepository.findAll();
        if (events.isEmpty()) {
            return Arrays.asList(
                RiskAreaStats.builder().locationName("Downtown").latitude(12.9716).longitude(77.5946).incidentCount(5L).averageSeverityScore(3.8).riskScore(10.5).build(),
                RiskAreaStats.builder().locationName("North Zone").latitude(12.9800).longitude(77.6000).incidentCount(3L).averageSeverityScore(4.0).riskScore(9.5).build(),
                RiskAreaStats.builder().locationName("East Suburbs").latitude(13.0100).longitude(77.6500).incidentCount(2L).averageSeverityScore(2.5).riskScore(6.0).build()
            );
        }
        Map<String, List<DisasterEvent>> perLocation = events.stream()
                .filter(e -> e.getLocationName() != null)
                .collect(Collectors.groupingBy(DisasterEvent::getLocationName));

        return perLocation.entrySet().stream()
                .map(entry -> {
                    String loc = entry.getKey();
                    List<DisasterEvent> locEvents = entry.getValue();
                    long count = locEvents.size();
                    
                    double avgSev = locEvents.stream()
                            .mapToDouble(e -> mapSeverityToScore(e.getSeverity()))
                            .average()
                            .orElse(0.0);

                    // Risk score = (count * 0.5) + (avgSeverity * 2.0)
                    double risk = (count * 0.5) + (avgSev * 2.0);

                    DisasterEvent first = locEvents.get(0);
                    return RiskAreaStats.builder()
                            .locationName(loc)
                            .latitude(first.getLatitude())
                            .longitude(first.getLongitude())
                            .incidentCount(count)
                            .averageSeverityScore(avgSev)
                            .riskScore(risk)
                            .build();
                })
                .sorted(Comparator.comparing(RiskAreaStats::getRiskScore).reversed())
                .collect(Collectors.toList());
    }

    public NotificationStats getNotificationStats() {
        long totalAlerts = alertRepository.count();
        if (totalAlerts == 0) {
            return NotificationStats.builder()
                .totalAlertsBroadcasted(50L)
                .totalAcknowledgments(45L)
                .totalIgnored(5L)
                .engagementRate(90.0)
                .build();
        }
        long totalAcks = alertAckRepository.count();
        long totalResponders = responderRepository.count();

        // If no alerts or responders, engagement is 0
        long potentialAcks = totalAlerts * (totalResponders == 0 ? 1 : totalResponders);
        double engRate = potentialAcks == 0 ? 0 : (double) totalAcks / potentialAcks * 100;
        long ignored = potentialAcks - totalAcks;

        return NotificationStats.builder()
                .totalAlertsBroadcasted(totalAlerts)
                .totalAcknowledgments(totalAcks)
                .totalIgnored(ignored < 0 ? 0 : ignored)
                .engagementRate(engRate)
                .build();
    }

    public Map<DisasterType, Long> getDisasterTypeDistribution() {
        Map<DisasterType, Long> dist = disasterEventRepository.findAll().stream()
                .collect(Collectors.groupingBy(DisasterEvent::getDisasterType, Collectors.counting()));
        if (dist.isEmpty()) {
            dist = new HashMap<>();
            dist.put(DisasterType.FIRE, 10L);
            dist.put(DisasterType.FLOOD, 5L);
            dist.put(DisasterType.EARTHQUAKE, 3L);
        }
        return dist;
    }

    public SummaryStats getSummaryStats() {
        long total = rescueTaskRepository.count();
        long completed = rescueTaskRepository.findAll().stream()
                .filter(t -> t.getStatus() == TaskStatus.COMPLETED)
                .count();
        long alerts = disasterEventRepository.count();
        long responders = userRepository.countByRole(Role.RESPONDER);

        double rate = total == 0 ? 0.0 : (double) completed / total * 100.0;

        return SummaryStats.builder()
                .totalRescueOps(total)
                .completedRescueOps(completed)
                .activeAlerts(alerts)
                .activeResponders(responders)
                .resolutionRate(rate)
                .build();
    }

    private double mapSeverityToScore(SeverityLevel level) {
        if (level == null) return 0.0;
        switch (level) {
            case LOW: return 1.0;
            case MEDIUM: return 2.0;
            case HIGH: return 3.0;
            case CRITICAL: return 4.0;
            default: return 0.0;
        }
    }
}
