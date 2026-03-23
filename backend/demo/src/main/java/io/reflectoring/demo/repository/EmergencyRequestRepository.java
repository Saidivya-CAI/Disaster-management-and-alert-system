package io.reflectoring.demo.repository;

import io.reflectoring.demo.entity.EmergencyRequest;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmergencyRequestRepository extends JpaRepository<EmergencyRequest, Long> {
}
