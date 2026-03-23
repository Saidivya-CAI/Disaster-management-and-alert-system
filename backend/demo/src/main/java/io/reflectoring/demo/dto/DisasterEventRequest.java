package io.reflectoring.demo.dto;

import lombok.Data;

@Data
public class DisasterEventRequest {
    private String title;
    private String description;
    private String message; // Keeping for backward compatibility if any
    private String region;
    private String disasterType;
    private String severity;
    private String locationName;
}
