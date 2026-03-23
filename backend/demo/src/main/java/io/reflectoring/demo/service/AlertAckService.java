package io.reflectoring.demo.service;

import io.reflectoring.demo.entity.AlertAcknowledgment;
import io.reflectoring.demo.repository.AlertAckRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AlertAckService {
    private final AlertAckRepository repo;

    public AlertAcknowledgment acknowledge(Long alertId, Long responderId, io.reflectoring.demo.entity.AckStatus status) {
        AlertAcknowledgment ack = AlertAcknowledgment.builder()
                .alert(new io.reflectoring.demo.entity.Alert(alertId,null,null,null,null,null,null))
                .responderId(responderId)
                .status(status)
                .acknowledgedAt(LocalDateTime.now())
                .build();
        return repo.save(ack);
    }

    public List<AlertAcknowledgment> forAlert(Long alertId) {
        return repo.findByAlertId(alertId);
    }
}
