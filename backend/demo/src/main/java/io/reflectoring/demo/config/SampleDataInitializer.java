package io.reflectoring.demo.config;

import io.reflectoring.demo.entity.*;
import io.reflectoring.demo.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class SampleDataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final DisasterEventRepository disasterEventRepository;
    private final RescueTaskRepository rescueTaskRepository;
    private final RescueReportRepository rescueReportRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.count() > 0) {
            log.info("Database already populated. Skipping sample data initialization.");
            return;
        }

        log.info("Initializing sample data for Disaster Management System...");

        // 1. Create Users
        User admin = createUser("admin@disaster.com", "admin123", Role.ADMIN);
        User responder1 = createUser("responder1@disaster.com", "resp123", Role.RESPONDER);
        User responder2 = createUser("responder2@disaster.com", "resp123", Role.RESPONDER);
        User citizen = createUser("citizen@example.com", "citizen123", Role.CITIZEN);

        // 2. Create Profiles
        createProfile(admin, "System Admin", "9999999999", "Main Command Center", "New Delhi", "O+", "112", 28.6139, 77.2090);
        createProfile(responder1, "John Responder", "8888888888", "South Station", "Mumbai", "A+", "101", 19.0760, 72.8777);
        createProfile(responder2, "Jane Responder", "7777777777", "East Wing", "Chennai", "B+", "108", 13.0827, 80.2707);
        createProfile(citizen, "Common Citizen", "6666666666", "Residency Road", "Bangalore", "AB+", "100", 12.9716, 77.5946);

        // 3. Create Disaster Events
        DisasterEvent floodEvent = createDisasterEvent(
                "Flash Flood in Mumbai",
                "Severe flash flooding in suburban Mumbai due to heavy monsoon rains.",
                DisasterType.FLOOD,
                SeverityLevel.CRITICAL,
                AlertStatus.ACTIVE,
                "Mumbai",
                19.0760, 72.8777,
                admin
        );

        DisasterEvent earthquakeEvent = createDisasterEvent(
                "Earthquake near Delhi",
                "Magnitude 5.2 earthquake felt in Delhi NCR regions.",
                DisasterType.EARTHQUAKE,
                SeverityLevel.HIGH,
                AlertStatus.VERIFIED,
                "New Delhi",
                28.6139, 77.2090,
                admin
        );

        DisasterEvent wildfireEvent = createDisasterEvent(
                "Wildfire in Uttarakhand",
                "Forest fires spreading in the hills of Uttarakhand.",
                DisasterType.WILDFIRE,
                SeverityLevel.MEDIUM,
                AlertStatus.PENDING_VERIFICATION,
                "Uttarakhand",
                30.0668, 79.0193,
                null
        );

        // 4. Create Rescue Tasks
        RescueTask task1 = createRescueTask(
                "Evacuate Dharavi Low-lands",
                "Urgent evacuation required for 200 families in low-lying areas of Dharavi.",
                floodEvent,
                responder1,
                citizen,
                SeverityLevel.CRITICAL,
                TaskStatus.IN_PROGRESS,
                "Dharavi, Mumbai",
                19.0402, 72.8508
        );

        RescueTask task2 = createRescueTask(
                "Building Inspection - CP",
                "Inspect old buildings in Connaught Place for structural damage after tremors.",
                earthquakeEvent,
                responder2,
                admin,
                SeverityLevel.HIGH,
                TaskStatus.COMPLETED,
                "Connaught Place, New Delhi",
                28.6315, 77.2167
        );

        // 5. Create Rescue Reports
        createRescueReport(task1, responder1, "Initiated evacuation. 50 families moved to high ground. Need more boats.", null);
        createRescueReport(task2, responder2, "Inspection completed. 3 buildings marked as unsafe. No casualties reported.", "https://example.com/images/building_damage.jpg");

        log.info("Sample data initialization completed successfully.");
    }

    private User createUser(String email, String password, Role role) {
        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(password))
                .role(role)
                .build();
        return userRepository.save(user);
    }

    private void createProfile(User user, String name, String phone, String address, String region, String blood, String eContact, Double lat, Double lon) {
        Profile profile = Profile.builder()
                .user(user)
                .name(name)
                .phoneNumber(phone)
                .address(address)
                .region(region)
                .bloodGroup(blood)
                .emergencyContact(eContact)
                .latitude(lat)
                .longitude(lon)
                .build();
        profileRepository.save(profile);
    }

    private DisasterEvent createDisasterEvent(String title, String desc, DisasterType type, SeverityLevel severity, AlertStatus status, String region, Double lat, Double lon, User admin) {
        DisasterEvent event = DisasterEvent.builder()
                .title(title)
                .description(desc)
                .disasterType(type)
                .severity(severity)
                .status(status)
                .region(region)
                .latitude(lat)
                .longitude(lon)
                .locationName(region)
                .source("SYSTEM")
                .eventTime(LocalDateTime.now().minusHours(2))
                .verifiedBy(admin)
                .verifiedAt(admin != null ? LocalDateTime.now().minusHours(1) : null)
                .createdAt(LocalDateTime.now().minusHours(3))
                .build();
        return disasterEventRepository.save(event);
    }

    private RescueTask createRescueTask(String desc, String taskDesc, DisasterEvent event, User responder, User citizen, SeverityLevel priority, TaskStatus status, String location, Double lat, Double lon) {
        RescueTask task = RescueTask.builder()
                .description(desc)
                .taskDescription(taskDesc)
                .disasterEvent(event)
                .responder(responder)
                .citizen(citizen)
                .priority(priority)
                .status(status)
                .locationName(location)
                .latitude(lat)
                .longitude(lon)
                .createdAt(LocalDateTime.now().minusHours(1))
                .build();
        return rescueTaskRepository.save(task);
    }

    private void createRescueReport(RescueTask task, User responder, String update, String imageUrls) {
        RescueReport report = RescueReport.builder()
                .rescueTask(task)
                .responder(responder)
                .statusUpdate(update)
                .imageUrls(imageUrls)
                .timestamp(LocalDateTime.now())
                .build();
        rescueReportRepository.save(report);
    }
}
