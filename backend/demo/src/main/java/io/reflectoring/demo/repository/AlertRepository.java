package io.reflectoring.demo.repository;

import io.reflectoring.demo.entity.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AlertRepository extends JpaRepository<Alert, Long> {
    List<Alert> findByAffectedZone(String zone);
}
