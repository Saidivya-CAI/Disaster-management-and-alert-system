package io.reflectoring.demo.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "rescue_reports")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RescueReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "rescue_task_id", nullable = false)
    private RescueTask rescueTask;

    @ManyToOne
    @JoinColumn(name = "responder_id", nullable = false)
    private User responder;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String statusUpdate;

    @Column(columnDefinition = "LONGTEXT")
    private String imageUrls; // CSV or JSON string of image URLs

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        timestamp = LocalDateTime.now();
    }
}
