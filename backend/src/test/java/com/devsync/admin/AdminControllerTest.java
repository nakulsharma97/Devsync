package com.devsync.admin;

import com.devsync.admin.dto.AdminProjectSummary;
import com.devsync.admin.dto.AdminUserSummary;
import com.devsync.admin.dto.DashboardResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AdminService adminService;

    private DashboardResponse sampleDashboard() {
        return DashboardResponse.builder()
                .totalUsers(12).activeUsers(9).blockedUsers(2)
                .totalProjects(5).totalTeams(3).totalTasks(40)
                .totalMessages(120).totalPosts(30)
                .recentUsers(List.of(AdminUserSummary.builder()
                        .id("u1").email("dev@test.com").fullName("Dev User")
                        .username("dev").role("USER").blocked(false)
                        .createdAt(Instant.now()).build()))
                .recentProjects(List.of(AdminProjectSummary.builder()
                        .id("p1").name("DevSync").status("ACTIVE")
                        .ownerId("u1").createdAt(Instant.now()).build()))
                .build();
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void dashboard_shouldReturn200_ForAdmin() throws Exception {
        when(adminService.getDashboard()).thenReturn(sampleDashboard());

        mockMvc.perform(get("/api/admin/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalUsers").value(12))
                .andExpect(jsonPath("$.activeUsers").value(9))
                .andExpect(jsonPath("$.blockedUsers").value(2))
                .andExpect(jsonPath("$.totalProjects").value(5))
                .andExpect(jsonPath("$.totalTeams").value(3))
                .andExpect(jsonPath("$.totalTasks").value(40))
                .andExpect(jsonPath("$.totalMessages").value(120))
                .andExpect(jsonPath("$.totalPosts").value(30))
                .andExpect(jsonPath("$.recentUsers[0].fullName").value("Dev User"))
                .andExpect(jsonPath("$.recentProjects[0].name").value("DevSync"));
    }

    @Test
    @WithMockUser
    void dashboard_shouldReturn403_ForNormalUser() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard"))
                .andExpect(status().isForbidden());
    }

    @Test
    void dashboard_shouldNotBePubliclyAccessible() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard"))
                .andExpect(status().is3xxRedirection());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void check_shouldReturnIsAdminTrue_ForAdmin() throws Exception {
        when(adminService.isAdmin(anyString())).thenReturn(true);

        mockMvc.perform(get("/api/admin/check"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isAdmin").value(true));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void users_shouldReturn200_ForAdmin() throws Exception {
        when(adminService.getAllUsers()).thenReturn(List.of());

        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void users_shouldReturn403_ForNormalUser() throws Exception {
        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isForbidden());
    }
}
