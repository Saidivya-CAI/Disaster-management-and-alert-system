package io.reflectoring.demo.controller;

import io.reflectoring.demo.repository.RescueReportRepository;
import io.reflectoring.demo.repository.RescueTaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/debug")
@RequiredArgsConstructor
public class DebugController {

    private final RescueReportRepository rescueReportRepository;
    private final RescueTaskRepository rescueTaskRepository;

    @GetMapping("/reports")
    public List<Map<String, Object>> getAllReports() {
        return rescueReportRepository.findAll().stream().map(r -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", r.getId());
            map.put("taskId", r.getRescueTask().getId());
            map.put("taskDesc", r.getRescueTask().getDescription());
            map.put("responder", r.getResponder().getEmail());
            map.put("status", r.getStatusUpdate());
            map.put("timestamp", r.getTimestamp());
            return map;
        }).collect(Collectors.toList());
    }

    @GetMapping("/tasks")
    public List<Map<String, Object>> getAllTasks() {
        return rescueTaskRepository.findAll().stream().map(t -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", t.getId());
            map.put("desc", t.getDescription());
            map.put("status", t.getStatus());
            map.put("responder", t.getResponder() != null ? t.getResponder().getEmail() : "None");
            return map;
        }).collect(Collectors.toList());
    }
}
