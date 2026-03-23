package io.reflectoring.demo.service;

import io.reflectoring.demo.entity.Alert;
import io.reflectoring.demo.repository.AlertRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AlertService {
    private final AlertRepository alertRepo;
    private final SimpMessagingTemplate ws;

    public Alert create(Alert a) {
        a.setCreatedAt(LocalDateTime.now());
        Alert saved = alertRepo.save(a);
        String topic = "/topic/alerts/" + a.getAffectedZone().replaceAll("\\s+", "_").toLowerCase();
        ws.convertAndSend(topic, saved);
        return saved;
    }

    public List<Alert> forZone(String zone) {
        return alertRepo.findByAffectedZone(zone);
    }
}
