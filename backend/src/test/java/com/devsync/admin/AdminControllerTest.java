package com.devsync.admin;

import com.devsync.admin.dto.AdminProjectSummary;
import com.devsync.admin.dto.AdminUserListItem;
import com.devsync.admin.dto.AdminUserSummary;
import com.devsync.admin.dto.DashboardResponse;
import com.devsync.common.PageResponse;
import com.devsync.common.ResourceNotFoundException;
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

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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

    @Test
    @WithMockUser(roles = "ADMIN")
    void usersPaged_shouldReturn200_WithPageResponse_ForAdmin() throws Exception {
        PageResponse<AdminUserListItem> page = PageResponse.<AdminUserListItem>builder()
                .content(List.of(AdminUserListItem.builder()
                        .id("u1").fullName("Dev User").username("dev")
                        .email("dev@test.com").role("USER").status("ACTIVE")
                        .createdAt(Instant.now()).build()))
                .page(0).size(10).totalElements(1).totalPages(1).last(true)
                .build();
        when(adminService.getUsersPage(anyInt(), anyInt(), any(), any(), any(), any(), any()))
                .thenReturn(page);

        mockMvc.perform(get("/api/admin/users/paged")
                        .param("page", "0")
                        .param("size", "10")
                        .param("sortBy", "createdAt")
                        .param("sortDir", "desc")
                        .param("search", "dev")
                        .param("role", "USER")
                        .param("status", "ACTIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].fullName").value("Dev User"))
                .andExpect(jsonPath("$.content[0].status").value("ACTIVE"))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.totalPages").value(1));
    }

    @Test
    @WithMockUser
    void usersPaged_shouldReturn403_ForNormalUser() throws Exception {
        mockMvc.perform(get("/api/admin/users/paged"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void userDetail_shouldReturn200_ForAdmin() throws Exception {
        when(adminService.getUserDetail("u1")).thenReturn(com.devsync.admin.dto.AdminUserDetail.builder()
                .id("u1").fullName("Dev User").email("dev@test.com")
                .role("USER").status("ACTIVE")
                .postsCount(5).messagesCount(12)
                .createdAt(Instant.now())
                .projectsJoined(List.of())
                .projectsOwned(List.of())
                .teams(List.of())
                .build());

        mockMvc.perform(get("/api/admin/users/u1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Dev User"))
                .andExpect(jsonPath("$.postsCount").value(5))
                .andExpect(jsonPath("$.messagesCount").value(12));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void userDetail_shouldReturn404_WhenNotFound() throws Exception {
        when(adminService.getUserDetail("ghost"))
                .thenThrow(new ResourceNotFoundException("User", "ghost"));

        mockMvc.perform(get("/api/admin/users/ghost"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
    void userDetail_shouldReturn403_ForNormalUser() throws Exception {
        mockMvc.perform(get("/api/admin/users/u1"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void deleteUser_shouldReturn204_ForAdmin() throws Exception {
        mockMvc.perform(delete("/api/admin/users/u1"))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser
    void deleteUser_shouldReturn403_ForNormalUser() throws Exception {
        mockMvc.perform(delete("/api/admin/users/u1"))
                .andExpect(status().isForbidden());
    }
}
