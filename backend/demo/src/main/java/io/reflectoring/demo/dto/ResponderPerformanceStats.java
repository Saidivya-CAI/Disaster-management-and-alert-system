package io.reflectoring.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResponderPerformanceStats {
    private String name;
    private String email;
    private Long totalTasks;
    private Long completedTasks;
    private Double completionRate;
    private Double averageResponseTimeMinutes;
}
