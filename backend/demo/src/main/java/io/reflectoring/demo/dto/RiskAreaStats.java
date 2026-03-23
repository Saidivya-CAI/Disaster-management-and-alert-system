package io.reflectoring.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RiskAreaStats {
    private String locationName;
    private Double latitude;
    private Double longitude;
    private Long incidentCount;
    private Double averageSeverityScore; // 1-Low, 2-Medium, 3-High, 4-Critical
    private Double riskScore; // Weighted combo of frequency and severity
}
