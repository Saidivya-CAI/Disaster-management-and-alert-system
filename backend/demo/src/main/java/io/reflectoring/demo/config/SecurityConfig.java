package io.reflectoring.demo.config;

import io.reflectoring.demo.service.UserDetailsServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {

        private final UserDetailsServiceImpl userDetailsService;
        private final JwtAuthFilter jwtAuthFilter;

        @Bean
        public PasswordEncoder passwordEncoder() {
                return new BCryptPasswordEncoder();
        }

        @Bean
        public AuthenticationProvider authenticationProvider() {
                DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
                provider.setUserDetailsService(userDetailsService);
                provider.setPasswordEncoder(passwordEncoder());
                return provider;
        }

        @Bean
        public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
                return config.getAuthenticationManager();
        }

        @Bean
        public CorsConfigurationSource corsConfigurationSource() {
                CorsConfiguration config = new CorsConfiguration();
                config.setAllowedOriginPatterns(List.of("http://localhost:4200", "http://localhost:*"));
                config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
                config.setAllowedHeaders(List.of("*"));
                config.setAllowCredentials(true);
                config.setMaxAge(3600L);
                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                source.registerCorsConfiguration("/**", config);
                return source;
        }

        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
                http
                                .csrf(csrf -> csrf.disable())
                                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                                .authenticationProvider(authenticationProvider())
                                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                                .authorizeHttpRequests(auth -> auth
                                                // Profile endpoints require authentication (must come before the
                                                // wildcard)
                                                .requestMatchers("/api/auth/profile/**").authenticated()
                                                .requestMatchers("/api/auth/me").authenticated()
                                                .requestMatchers("/api/auth/**").permitAll()
                                                .requestMatchers(HttpMethod.GET, "/api/disasters/**").permitAll()
                                                .requestMatchers(HttpMethod.GET, "/api/citizen/alerts").permitAll()
                                                .requestMatchers("/api/debug/**").permitAll()
                                                .requestMatchers("/ws-disaster-alerts/**", "/ws/**", "/topic/**")
                                                .permitAll()
                                                // Admin endpoints should only be accessible to authenticated users
                                                // with the ADMIN role. Previously these paths were opened to everyone
                                                // which allowed anonymous PUT requests and resulted in confusing 403
                                                // errors when a request was made without a valid token. Tighten the
                                                // configuration so the security layer is exercised and the client gets
                                                // a meaningful 401/403 if something is wrong with the authentication.
                                                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                                                .requestMatchers("/api/responder/**").hasAnyRole("RESPONDER", "ADMIN")
                                                .requestMatchers("/api/citizen/**").authenticated()
                                                .anyRequest().authenticated());

                return http.build();
        }
}
