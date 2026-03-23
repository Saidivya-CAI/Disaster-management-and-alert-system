package io.reflectoring.demo.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "rescue_tasks")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RescueTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String description;

    @Column(columnDefinition = "TEXT")
    private String taskDescription;

    private String emergencyType;
    private String citizenSeverity;

    private String locationName;
    private Double latitude;
    private Double longitude;

    @ManyToOne
    @JoinColumn(name = "responder_id")
    private User responder;

    @ManyToOne
    @JoinColumn(name = "disaster_event_id")
    private DisasterEvent disasterEvent;

    @Enumerated(EnumType.STRING)
    private SeverityLevel priority;

    @ManyToOne
    @JoinColumn(name = "citizen_id")
    private User citizen;

    @ManyToOne
    @JoinColumn(name = "verified_by_id")
    private User verifiedBy;

    private LocalDateTime verifiedAt;
    private String rejectionReason;

    private Boolean acknowledged = false;
    private LocalDateTime acknowledgedAt;
    private LocalDateTime resolvedAt;

    private Boolean reportSubmitted = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskStatus status;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
