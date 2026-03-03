package io.reflectoring.demo.repository;

import io.reflectoring.demo.entity.RescueTask;
import io.reflectoring.demo.entity.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RescueTaskRepository extends JpaRepository<RescueTask, Long> {
    List<RescueTask> findByResponderId(Long responderId);

    List<RescueTask> findByStatusAndResponderIsNull(TaskStatus status);
}
