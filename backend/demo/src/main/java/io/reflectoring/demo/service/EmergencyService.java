package io.reflectoring.demo.service;

import io.reflectoring.demo.entity.EmergencyRequest;
import io.reflectoring.demo.entity.Responder;
import io.reflectoring.demo.entity.Availability;
import io.reflectoring.demo.repository.EmergencyRequestRepository;
import io.reflectoring.demo.repository.ResponderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EmergencyService {
    private final EmergencyRequestRepository reqRepo;
    private final ResponderRepository responderRepo;

    public EmergencyRequest create(EmergencyRequest req) {
        req.setCreatedAt(LocalDateTime.now());
        req.setStatus(io.reflectoring.demo.entity.RequestStatus.PENDING);
        EmergencyRequest saved = reqRepo.save(req);
        assignNearest(saved);
        return saved;
    }

    private void assignNearest(EmergencyRequest r) {
        List<Responder> candidates = responderRepo.findByAvailabilityStatus(Availability.AVAILABLE);
        if (candidates.isEmpty()) return;
        Responder nearest = candidates.stream()
                .min(Comparator.comparingDouble(res -> distance(
                        r.getLatitude(), r.getLongitude(),
                        res.getLatitude(), res.getLongitude())))
                .orElse(null);
        if (nearest != null) {
            r.setStatus(io.reflectoring.demo.entity.RequestStatus.ASSIGNED);
            reqRepo.save(r);
            nearest.setAvailabilityStatus(Availability.BUSY);
            responderRepo.save(nearest);
        }
    }

    private double distance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // km
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat/2) * Math.sin(dLat/2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon/2) * Math.sin(dLon/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }
}
