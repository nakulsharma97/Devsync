package com.devsync.report;

import com.devsync.common.PageResponse;
import com.devsync.report.dto.AdminReportDetail;
import com.devsync.report.dto.AdminReportListItem;
import com.devsync.report.dto.AdminReportStats;
import com.devsync.report.dto.ModerateReportRequest;
import com.devsync.report.dto.ReviewReportRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

/**
 * Admin Reports & Moderation endpoints. Secured by the global
 * /api/admin/** ROLE_ADMIN rule in SecurityConfig.
 */
@RestController
@RequestMapping("/api/admin/reports")
@RequiredArgsConstructor
public class ReportAdminController {

    private final ReportAdminService reportAdminService;

    @GetMapping
    public ResponseEntity<PageResponse<AdminReportListItem>> getReportsPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDir,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String reason,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to) {
        return ResponseEntity.ok(reportAdminService.getReportsPage(
                page, size, sortBy, sortDir, search, status, reason, entityType, from, to));
    }

    @GetMapping("/stats")
    public ResponseEntity<AdminReportStats> getStats() {
        return ResponseEntity.ok(reportAdminService.getStats());
    }

    @GetMapping("/{reportId}")
    public ResponseEntity<AdminReportDetail> getReportDetail(@PathVariable String reportId) {
        return ResponseEntity.ok(reportAdminService.getReportDetail(reportId));
    }

    @PutMapping("/{reportId}/review")
    public ResponseEntity<AdminReportDetail> reviewReport(
            @PathVariable String reportId,
            @Valid @RequestBody ReviewReportRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(reportAdminService.reviewReport(
                reportId, request.getStatus(), userDetails.getUsername()));
    }

    @PutMapping("/{reportId}/moderate")
    public ResponseEntity<AdminReportDetail> moderate(
            @PathVariable String reportId,
            @Valid @RequestBody ModerateReportRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(reportAdminService.moderate(
                reportId, request.getAction(), request.getValue(), userDetails.getUsername()));
    }
}
