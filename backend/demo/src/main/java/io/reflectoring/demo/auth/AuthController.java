package io.reflectoring.demo.auth;

import io.reflectoring.demo.config.JwtService;
import io.reflectoring.demo.entity.Profile;
import io.reflectoring.demo.entity.Role;
import io.reflectoring.demo.entity.User;
import io.reflectoring.demo.repository.ProfileRepository;
import io.reflectoring.demo.repository.UserRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegistrationRequest request) {
        try {
            if (request == null || request.getEmail() == null || request.getEmail().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
            }

            Optional<User> existingUser = userRepository.findByEmail(request.getEmail());
            if (existingUser.isPresent()) {
                return ResponseEntity.status(409).body(Map.of("error", "User already exists"));
            }

            User user = new User();
            user.setEmail(request.getEmail());
            user.setPassword(passwordEncoder.encode(request.getPassword()));

            // Convert role string to Role enum
            try {
                Role role = Role.valueOf((request.getRole() != null ? request.getRole() : "CITIZEN").toUpperCase());
                user.setRole(role);
            } catch (IllegalArgumentException e) {
                user.setRole(Role.CITIZEN);
            }

            User savedUser = userRepository.save(user);

            // Create and save profile
            Profile profile = Profile.builder()
                    .user(savedUser)
                    .name(request.getFullName())
                    .phoneNumber(request.getPhoneNumber())
                    .region(request.getRegion())
                    .build();
            profileRepository.save(profile);

            // Generate real JWT token
            UserDetails userDetails = userDetailsService.loadUserByUsername(savedUser.getEmail());
            String token = jwtService.generateToken(userDetails);

            Map<String, Object> response = new HashMap<>();
            response.put("token", token);
            response.put("role", savedUser.getRole().name());
            response.put("userId", savedUser.getId());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Registration failed: " + e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

            User user = userRepository.findByEmail(request.getEmail())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
            String token = jwtService.generateToken(userDetails);

            Map<String, Object> response = new HashMap<>();
            response.put("token", token);
            response.put("role", user.getRole().name());
            response.put("userId", user.getId());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
        }
    }

    @PutMapping("/profile/location")
    public ResponseEntity<?> updateLocation(@RequestBody LocationRequest request, java.security.Principal principal) {
        if (principal == null) {
            System.err.println("updateLocation: principal is null");
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        System.out.println("updateLocation: principal=" + principal.getName()
                + ", lat=" + request.getLatitude() + ", lon=" + request.getLongitude());

        try {
            User user = userRepository.findByEmail(principal.getName())
                    .orElseThrow(() -> new RuntimeException("User not found for email: " + principal.getName()));

            // Find or create profile
            Profile profile = profileRepository.findByUserId(user.getId())
                    .orElseGet(() -> {
                        System.out.println(
                                "updateLocation: No profile found for userId=" + user.getId() + ", creating one");
                        Profile newProfile = Profile.builder()
                                .user(user)
                                .name(user.getEmail())
                                .build();
                        return profileRepository.save(newProfile);
                    });

            profile.setLatitude(request.getLatitude());
            profile.setLongitude(request.getLongitude());
            profileRepository.save(profile);

            System.out.println("updateLocation: success for userId=" + user.getId());
            return ResponseEntity.ok(Map.of("message", "Location updated successfully"));
        } catch (Exception e) {
            System.err.println("updateLocation: FAILED - " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Failed to update location: " + e.getMessage()));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> whoAmI(java.security.Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }
        User user = userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Map<String, Object> response = new HashMap<>();
        response.put("email", user.getEmail());
        response.put("role", user.getRole().name());
        response.put("authorities", user.getAuthorities());
        return ResponseEntity.ok(response);
    }

    // DTO Classes
    @Data
    public static class RegistrationRequest {
        private String fullName;
        private String email;
        private String phoneNumber;
        private String region;
        private String password;
        private String role;
    }

    @Data
    public static class LoginRequest {
        private String email;
        private String password;
    }

    @Data
    public static class LocationRequest {
        private Double latitude;
        private Double longitude;
    }
}
