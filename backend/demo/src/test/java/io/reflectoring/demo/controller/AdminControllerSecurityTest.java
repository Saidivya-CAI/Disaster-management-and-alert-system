package io.reflectoring.demo.controller;

import io.reflectoring.demo.service.DisasterEventService;
import io.reflectoring.demo.repository.DisasterEventRepository;
import io.reflectoring.demo.repository.RescueTaskRepository;
import io.reflectoring.demo.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
class AdminControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    // controller dependencies must be mocked to allow context start
    // controller dependencies must be mocked to allow context start
    @MockBean
    private DisasterEventService disasterEventService;
    @MockBean
    private DisasterEventRepository disasterEventRepository;
    @MockBean
    private RescueTaskRepository rescueTaskRepository;
    @MockBean
    private UserRepository userRepository;

    // security configuration relies on these beans; provide mocks so the
    // application context can initialize without pulling in the real
    // authentication infrastructure.
    @MockBean
    private io.reflectoring.demo.service.UserDetailsServiceImpl userDetailsService;

    // the controller constructor also requires a messaging template
    @MockBean
    private org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    @MockBean
    private io.reflectoring.demo.service.NotificationService notificationService;

    @Test
    @DisplayName("PUT /api/admin/tasks/... should return 403 when not authenticated")
    void approveTask_requiresAuthentication() throws Exception {
        // with mocks and security config the endpoint rejects anonymous requests with 403
        mockMvc.perform(put("/api/admin/tasks/1/approve?priority=LOW"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "CITIZEN")
    @DisplayName("PUT /api/admin/tasks/... should return 403 for non-admin user")
    void approveTask_forbiddenToNonAdmin() throws Exception {
        mockMvc.perform(put("/api/admin/tasks/1/approve?priority=LOW"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("PUT /api/admin/tasks/... should allow admin user")
    void approveTask_allowedForAdmin() throws Exception {
        // stub the service so controller logic does not throw
        io.reflectoring.demo.entity.RescueTask fakeTask = new io.reflectoring.demo.entity.RescueTask();
        fakeTask.setStatus(io.reflectoring.demo.entity.TaskStatus.PENDING);
        fakeTask.setCreatedAt(java.time.LocalDateTime.now());
        org.mockito.Mockito.when(disasterEventService.approveRescueTask(
                        org.mockito.ArgumentMatchers.anyLong(),
                        org.mockito.ArgumentMatchers.any(),
                        org.mockito.ArgumentMatchers.anyString()))
                .thenReturn(fakeTask);

        mockMvc.perform(put("/api/admin/tasks/1/approve?priority=LOW"))
                .andExpect(status().isOk());
    }
}
