package com.devsync.report;

import com.devsync.common.PageResponse;
import com.devsync.report.dto.AdminReportDetail;
import com.devsync.report.dto.AdminReportListItem;
import com.devsync.report.dto.AdminReportStats;
import com.devsync.report.dto.ReporterDto;
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
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ReportAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ReportAdminService reportAdminService;

    private AdminReportListItem sampleItem() {
        return AdminReportListItem.builder()
                .id("r1")
                .reporter(ReporterDto.builder().id("u1").fullName("Reporter One").email("rep@test.com").build())
                .entityType("USER")
                .entityId("u2")
                .entityTitle("Reported User")
                .reason("HARASSMENT")
                .status("PENDING")
                .createdAt(Instant.now())
                .build();
    }

    private AdminReportDetail sampleDetail() {
        return AdminReportDetail.builder()
                .id("r1")
                .reporter(ReporterDto.builder().id("u1").fullName("Reporter One").email("rep@test.com").build())
                .entityType("USER")
                .entityId("u2")
                .entityTitle("Reported User")
                .entityOwnerId("u2")
                .entityOwnerName("Reported User")
                .reason("HARASSMENT")
                .description("Sends abusive messages")
                .status("RESOLVED")
                .reviewedBy("admin1")
                .reviewedByName("Admin One")
                .reviewedAt(Instant.now())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void reportsPage_shouldReturn200_ForAdmin() throws Exception {
        PageResponse<AdminReportListItem> page = PageResponse.<AdminReportListItem>builder()
                .content(List.of(sampleItem()))
                .page(0).size(10).totalElements(1).totalPages(1).last(true)
                .build();
        when(reportAdminService.getReportsPage(anyInt(), anyInt(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(page);

        mockMvc.perform(get("/api/admin/reports")
                        .param("page", "0").param("size", "10")
                        .param("search", "rep")
                        .param("status", "PENDING")
                        .param("reason", "HARASSMENT")
                        .param("entityType", "USER"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value("r1"))
                .andExpect(jsonPath("$.content[0].reporter.fullName").value("Reporter One"))
                .andExpect(jsonPath("$.content[0].status").value("PENDING"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    @WithMockUser
    void reportsPage_shouldReturn403_ForNormalUser() throws Exception {
        mockMvc.perform(get("/api/admin/reports"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void reportStats_shouldReturn200_ForAdmin() throws Exception {
        when(reportAdminService.getStats()).thenReturn(AdminReportStats.builder()
                .total(10).pending(5).underReview(2).resolved(2).rejected(1).build());

        mockMvc.perform(get("/api/admin/reports/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(10))
                .andExpect(jsonPath("$.pending").value(5))
                .andExpect(jsonPath("$.resolved").value(2))
                .andExpect(jsonPath("$.rejected").value(1));
    }

    @Test
    @WithMockUser
    void reportStats_shouldReturn403_ForNormalUser() throws Exception {
        mockMvc.perform(get("/api/admin/reports/stats"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void reportDetail_shouldReturn200_ForAdmin() throws Exception {
        when(reportAdminService.getReportDetail("r1")).thenReturn(sampleDetail());

        mockMvc.perform(get("/api/admin/reports/r1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entityTitle").value("Reported User"))
                .andExpect(jsonPath("$.reason").value("HARASSMENT"))
                .andExpect(jsonPath("$.reviewedByName").value("Admin One"))
                .andExpect(jsonPath("$.status").value("RESOLVED"));
    }

    @Test
    @WithMockUser
    void reportDetail_shouldReturn403_ForNormalUser() throws Exception {
        mockMvc.perform(get("/api/admin/reports/r1"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void reviewReport_shouldReturn200_ForAdmin() throws Exception {
        when(reportAdminService.reviewReport("r1", "RESOLVED", "admin1"))
                .thenReturn(sampleDetail());

        mockMvc.perform(put("/api/admin/reports/r1/review")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"RESOLVED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void reviewReport_shouldReturn400_WhenBlank() throws Exception {
        mockMvc.perform(put("/api/admin/reports/r1/review")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void moderate_shouldReturn200_ForAdmin() throws Exception {
        when(reportAdminService.moderate("r1", "BLOCK_USER", null, "admin1"))
                .thenReturn(sampleDetail());

        mockMvc.perform(put("/api/admin/reports/r1/moderate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"action\":\"BLOCK_USER\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("r1"));
    }

    @Test
    @WithMockUser
    void moderate_shouldReturn403_ForNormalUser() throws Exception {
        mockMvc.perform(put("/api/admin/reports/r1/moderate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"action\":\"BLOCK_USER\"}"))
                .andExpect(status().isForbidden());
    }
}
