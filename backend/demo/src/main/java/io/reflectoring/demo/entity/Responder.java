package io.reflectoring.demo.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "responders")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Responder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long responderId;

    @NotBlank
    private String name;

    private Double latitude;
    private Double longitude;

    @NotNull
    @Enumerated(EnumType.STRING)
    private Availability availabilityStatus;
}
