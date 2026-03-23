package io.reflectoring.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MonthlyDisasterStats {
    private String yearMonth; // Format: YYYY-MM
    private Long count;
}
