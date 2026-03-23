package io.reflectoring.demo.repository;

import io.reflectoring.demo.entity.RescueReport;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RescueReportRepository extends JpaRepository<RescueReport, Long> {
    @Query("SELECT r FROM RescueReport r WHERE r.rescueTask.id = :taskId ORDER BY r.timestamp DESC")
    List<RescueReport> findByRescueTaskIdOrderByTimestampDesc(@Param("taskId") Long taskId);

    List<RescueReport> findByResponderId(Long responderId);
}
