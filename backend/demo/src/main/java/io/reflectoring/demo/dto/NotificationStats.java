package io.reflectoring.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationStats {
    private long totalAlertsBroadcasted;
    private long totalAcknowledgments;
    private long totalIgnored;
    private double engagementRate;
}
