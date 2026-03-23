package io.reflectoring.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SummaryStats {
    private long totalRescueOps;
    private long completedRescueOps;
    private long activeResponders;
    private long activeAlerts;
    private double resolutionRate;
}
