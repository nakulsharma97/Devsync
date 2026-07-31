package com.devsync.report;

import com.devsync.common.ApiResponse;
import com.devsync.report.dto.CreateReportRequest;
import com.devsync.report.dto.ReportResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

/**
 * User-facing report submission. Authenticated users only.
 * Admin endpoints live under /api/admin/reports (see ReportAdminController).
 */
@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @PostMapping
    public ResponseEntity<ApiResponse<ReportResponse>> createReport(
            @Valid @RequestBody CreateReportRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        ReportResponse report = reportService.createReport(userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success("Report submitted", report));
    }
}
