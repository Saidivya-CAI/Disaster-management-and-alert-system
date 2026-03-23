package io.reflectoring.demo.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "emergency_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmergencyRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long requestId;

    @NotNull
    private Long citizenId;

    private String description;

    private Double latitude;
    private Double longitude;

    @NotNull
    @Enumerated(EnumType.STRING)
    private RequestStatus status;

    private LocalDateTime createdAt;
}
