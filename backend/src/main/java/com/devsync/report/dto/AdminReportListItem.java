package com.devsync.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminReportListItem {
    private String id;
    private ReporterDto reporter;
    private String entityType;
    private String entityId;
    private String entityTitle;
    private String reason;
    private String status;
    private Instant createdAt;
}
