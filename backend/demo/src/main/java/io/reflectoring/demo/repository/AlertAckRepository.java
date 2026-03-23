package io.reflectoring.demo.repository;

import io.reflectoring.demo.entity.AlertAcknowledgment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AlertAckRepository extends JpaRepository<AlertAcknowledgment, Long> {
    List<AlertAcknowledgment> findByAlertId(Long alertId);
}
