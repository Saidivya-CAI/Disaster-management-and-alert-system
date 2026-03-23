package io.reflectoring.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegionalPerformanceStats {
    private String region;
    private Double averageResponseTimeMinutes;
    private Double averageResolutionTimeMinutes;
    private Long totalTasks;
}
