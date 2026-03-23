package io.reflectoring.demo.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "alert_ack")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AlertAcknowledgment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private Alert alert;

    @NotNull
    private Long responderId;

    @NotNull
    @Enumerated(EnumType.STRING)
    private AckStatus status;

    private LocalDateTime acknowledgedAt;
}
