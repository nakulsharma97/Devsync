package com.devsync.admin;

import com.devsync.activity.ActivityService;
import com.devsync.activity.dto.ActivityResponse;
import com.devsync.activity.dto.ActivityUserDto;
import com.devsync.activity.dto.AdminActivityStats;
import com.devsync.admin.dto.AdminActivityItem;
import com.devsync.admin.dto.AdminKanbanStats;
import com.devsync.admin.dto.AdminProjectDetail;
import com.devsync.admin.dto.AdminProjectListItem;
import com.devsync.admin.dto.AdminProjectMember;
import com.devsync.admin.dto.AdminProjectOwner;
import com.devsync.admin.dto.AdminProjectStats;
import com.devsync.admin.dto.AdminProjectSummary;
import com.devsync.admin.dto.AdminUserListItem;
import com.devsync.admin.dto.AdminUserResponse;
import com.devsync.admin.dto.AdminUserSummary;
import com.devsync.admin.dto.DashboardResponse;
import com.devsync.audit.AuditLogService;
import com.devsync.audit.dto.AuditLogResponse;
import com.devsync.common.PageResponse;
import com.devsync.common.ResourceNotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
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

    @MockitoBean
    private ActivityService activityService;

    @MockitoBean
    private AuditLogService auditLogService;

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

    private AdminProjectListItem sampleProjectItem() {
        return AdminProjectListItem.builder()
                .id("p1").name("DevSync").description("Collab platform")
                .ownerId("u1").ownerName("Dev User").ownerEmail("dev@test.com")
                .visibility("PUBLIC").status("ACTIVE")
                .membersCount(3).tasksCount(7).postsCount(2)
                .createdAt(Instant.now()).updatedAt(Instant.now())
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
    void dashboard_shouldReturn401_WhenNoToken() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void users_shouldReturn401_WhenNoToken() throws Exception {
        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void auditLogs_shouldReturn401_WhenNoToken() throws Exception {
        mockMvc.perform(get("/api/admin/audit-logs"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void projects_shouldReturn401_WhenNoToken() throws Exception {
        mockMvc.perform(get("/api/admin/projects"))
                .andExpect(status().isUnauthorized());
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
        when(adminService.getUsersPage(anyInt(), anyInt(), any(), any(), any(), any(), any(), any(), any()))
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
    @WithMockUser(roles = "ADMIN")
    void usersPaged_shouldPassCreatedDateFiltersToService() throws Exception {
        PageResponse<AdminUserListItem> page = PageResponse.<AdminUserListItem>builder()
                .content(List.of()).page(0).size(10).totalElements(0).totalPages(0).last(true)
                .build();
        when(adminService.getUsersPage(anyInt(), anyInt(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(page);

        mockMvc.perform(get("/api/admin/users/paged")
                        .param("from", "2026-01-01")
                        .param("to", "2026-01-31"))
                .andExpect(status().isOk());

        verify(adminService).getUsersPage(anyInt(), anyInt(), any(), any(), any(), any(), any(),
                eq("2026-01-01"), eq("2026-01-31"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void blockUser_shouldAcceptReasonBody() throws Exception {
        when(adminService.setUserBlocked(eq("u1"), eq(true), anyString(), eq("spam")))
                .thenReturn(AdminUserResponse.builder()
                        .id("u1").email("dev@test.com").fullName("Dev User")
                        .role("USER").blocked(true).postCount(0).followerCount(0)
                        .createdAt(Instant.now()).build());

        mockMvc.perform(put("/api/admin/users/u1/block")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"spam\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.blocked").value(true));
    }

    @Test
    @WithMockUser
    void blockUser_shouldReturn403_ForNormalUser() throws Exception {
        mockMvc.perform(put("/api/admin/users/u1/block"))
                .andExpect(status().isForbidden());
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

    // ---------- Admin Project Management endpoints ----------

    @Test
    @WithMockUser(roles = "ADMIN")
    void projectsPage_shouldReturn200_ForAdmin() throws Exception {
        PageResponse<AdminProjectListItem> page = PageResponse.<AdminProjectListItem>builder()
                .content(List.of(sampleProjectItem()))
                .page(0).size(10).totalElements(1).totalPages(1).last(true)
                .build();
        when(adminService.getProjectsPage(anyInt(), anyInt(), any(), any(), any(), any(), any()))
                .thenReturn(page);

        mockMvc.perform(get("/api/admin/projects")
                        .param("page", "0").param("size", "10")
                        .param("sortBy", "newest").param("sortDir", "desc")
                        .param("search", "dev").param("visibility", "PUBLIC")
                        .param("status", "ACTIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("DevSync"))
                .andExpect(jsonPath("$.content[0].membersCount").value(3))
                .andExpect(jsonPath("$.content[0].tasksCount").value(7))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.totalPages").value(1));
    }

    @Test
    @WithMockUser
    void projectsPage_shouldReturn403_ForNormalUser() throws Exception {
        mockMvc.perform(get("/api/admin/projects"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void projectStats_shouldReturn200_ForAdmin() throws Exception {
        when(adminService.getProjectStats()).thenReturn(AdminProjectStats.builder()
                .total(10).active(7).archived(2).publicCount(6).privateCount(4).build());

        mockMvc.perform(get("/api/admin/projects/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(10))
                .andExpect(jsonPath("$.active").value(7))
                .andExpect(jsonPath("$.archived").value(2))
                .andExpect(jsonPath("$.publicCount").value(6))
                .andExpect(jsonPath("$.privateCount").value(4));
    }

    @Test
    @WithMockUser
    void projectStats_shouldReturn403_ForNormalUser() throws Exception {
        mockMvc.perform(get("/api/admin/projects/stats"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void projectDetail_shouldReturn200_ForAdmin() throws Exception {
        AdminProjectDetail detail = AdminProjectDetail.builder()
                .id("p1").name("DevSync").description("Collab platform")
                .owner(AdminProjectOwner.builder().id("u1").fullName("Dev User").email("dev@test.com").build())
                .visibility("PUBLIC").status("ACTIVE").memberCount(1)
                .members(List.of(AdminProjectMember.builder()
                        .userId("u1").fullName("Dev User").role("OWNER").build()))
                .kanbanStats(AdminKanbanStats.builder().totalTasks(7).completedTasks(3).pendingTasks(4).build())
                .postsCount(2).messagesCount(5)
                .recentActivity(List.of(AdminActivityItem.builder()
                        .type("TASK").title("Task updated: Ship it").timestamp(Instant.now()).build()))
                .createdAt(Instant.now()).updatedAt(Instant.now())
                .build();
        when(adminService.getProjectDetail("p1")).thenReturn(detail);

        mockMvc.perform(get("/api/admin/projects/p1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("DevSync"))
                .andExpect(jsonPath("$.owner.fullName").value("Dev User"))
                .andExpect(jsonPath("$.kanbanStats.completedTasks").value(3))
                .andExpect(jsonPath("$.messagesCount").value(5))
                .andExpect(jsonPath("$.recentActivity[0].type").value("TASK"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void projectDetail_shouldReturn404_WhenNotFound() throws Exception {
        when(adminService.getProjectDetail("ghost"))
                .thenThrow(new ResourceNotFoundException("Project", "ghost"));

        mockMvc.perform(get("/api/admin/projects/ghost"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
    void projectDetail_shouldReturn403_ForNormalUser() throws Exception {
        mockMvc.perform(get("/api/admin/projects/p1"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void archiveProject_shouldReturn200_ForAdmin() throws Exception {
        when(adminService.archiveProject(eq("p1"), anyString())).thenReturn(sampleProjectItem());

        mockMvc.perform(put("/api/admin/projects/p1/archive"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    @WithMockUser
    void archiveProject_shouldReturn403_ForNormalUser() throws Exception {
        mockMvc.perform(put("/api/admin/projects/p1/archive"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void restoreProject_shouldReturn200_ForAdmin() throws Exception {
        when(adminService.restoreProject(eq("p1"), anyString())).thenReturn(sampleProjectItem());

        mockMvc.perform(put("/api/admin/projects/p1/restore"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("DevSync"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void updateVisibility_shouldReturn200_ForAdmin() throws Exception {
        AdminProjectListItem item = sampleProjectItem();
        item.setVisibility("PRIVATE");
        when(adminService.setProjectVisibility(eq("p1"), eq("PRIVATE"), anyString())).thenReturn(item);

        mockMvc.perform(put("/api/admin/projects/p1/visibility")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"visibility\":\"PRIVATE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.visibility").value("PRIVATE"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void updateVisibility_shouldReturn400_WhenBlank() throws Exception {
        mockMvc.perform(put("/api/admin/projects/p1/visibility")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"visibility\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void updateVisibility_shouldReturn403_ForNormalUser() throws Exception {
        mockMvc.perform(put("/api/admin/projects/p1/visibility")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"visibility\":\"PRIVATE\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void deleteProject_shouldReturn204_ForAdmin() throws Exception {
        mockMvc.perform(delete("/api/admin/projects/p1"))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser
    void deleteProject_shouldReturn403_ForNormalUser() throws Exception {
        mockMvc.perform(delete("/api/admin/projects/p1"))
                .andExpect(status().isForbidden());
    }

    // ---------- Admin Activity & Audit Log endpoints ----------

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminActivity_shouldReturn200_ForAdmin() throws Exception {
        PageResponse<ActivityResponse> page = PageResponse.<ActivityResponse>builder()
                .content(List.of(ActivityResponse.builder()
                        .id("a1").projectId("p1").activityType("TASK_CREATED")
                        .title("Task created").createdAt(Instant.now())
                        .user(ActivityUserDto.builder().id("u1").fullName("Dev User").build())
                        .build()))
                .page(0).size(20).totalElements(1).totalPages(1).last(true)
                .build();
        when(activityService.getAdminActivities(any(), any(), any(), any(), any(), anyInt(), anyInt()))
                .thenReturn(page);

        mockMvc.perform(get("/api/admin/activity")
                        .param("projectId", "p1")
                        .param("activityType", "TASK_CREATED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].activityType").value("TASK_CREATED"))
                .andExpect(jsonPath("$.content[0].user.fullName").value("Dev User"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    @WithMockUser
    void adminActivity_shouldReturn403_ForNormalUser() throws Exception {
        mockMvc.perform(get("/api/admin/activity"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminActivityStats_shouldReturn200_ForAdmin() throws Exception {
        when(activityService.getAdminActivityStats()).thenReturn(AdminActivityStats.builder()
                .todayCount(10).projects(3).tasks(4).messages(2).build());

        mockMvc.perform(get("/api/admin/activity/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.todayCount").value(10))
                .andExpect(jsonPath("$.projects").value(3))
                .andExpect(jsonPath("$.tasks").value(4))
                .andExpect(jsonPath("$.messages").value(2));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void auditLogs_shouldReturn200_ForAdmin() throws Exception {
        PageResponse<AuditLogResponse> page = PageResponse.<AuditLogResponse>builder()
                .content(List.of(AuditLogResponse.builder()
                        .id("l1").performedByName("Admin One").targetUserName("Dev User")
                        .action("ROLE_CHANGED").status("SUCCESS").ipAddress("127.0.0.1")
                        .createdAt(Instant.now()).build()))
                .page(0).size(20).totalElements(1).totalPages(1).last(true)
                .build();
        when(auditLogService.getLogs(anyInt(), anyInt(), any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(page);

        mockMvc.perform(get("/api/admin/audit-logs")
                        .param("search", "dev")
                        .param("action", "ROLE_CHANGED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].action").value("ROLE_CHANGED"))
                .andExpect(jsonPath("$.content[0].performedByName").value("Admin One"));
    }

    @Test
    @WithMockUser
    void auditLogs_shouldReturn403_ForNormalUser() throws Exception {
        mockMvc.perform(get("/api/admin/audit-logs"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void auditLogDetail_shouldReturn200_ForAdmin() throws Exception {
        when(auditLogService.getLog("l1")).thenReturn(AuditLogResponse.builder()
                .id("l1").action("LOGIN_SUCCESS").status("SUCCESS").ipAddress("127.0.0.1")
                .createdAt(Instant.now()).build());

        mockMvc.perform(get("/api/admin/audit-logs/l1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.action").value("LOGIN_SUCCESS"))
                .andExpect(jsonPath("$.ipAddress").value("127.0.0.1"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void auditLogExport_shouldReturnCsv_ForAdmin() throws Exception {
        when(auditLogService.exportLogs(any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(List.of(AuditLogResponse.builder()
                        .id("l1").action("LOGIN_SUCCESS").status("SUCCESS")
                        .createdAt(Instant.now()).build()));
        when(auditLogService.toCsv(anyList())).thenReturn("id,created_at,action\nl1,,LOGIN_SUCCESS\n");

        mockMvc.perform(get("/api/admin/audit-logs/export"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/csv"))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("LOGIN_SUCCESS")));
    }

    @Test
    @WithMockUser
    void auditLogExport_shouldReturn403_ForNormalUser() throws Exception {
        mockMvc.perform(get("/api/admin/audit-logs/export"))
                .andExpect(status().isForbidden());
    }
}
