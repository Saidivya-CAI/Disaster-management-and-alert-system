package io.reflectoring.demo.repository;

import io.reflectoring.demo.entity.Responder;
import io.reflectoring.demo.entity.Availability;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ResponderRepository extends JpaRepository<Responder, Long> {
    List<Responder> findByAvailabilityStatus(Availability status);
}
