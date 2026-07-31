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
public class AdminReportDetail {
    private String id;
    private ReporterDto reporter;
    private String entityType;
    private String entityId;
    private String entityTitle;
    private String entityOwnerId;
    private String entityOwnerName;
    private String reason;
    private String description;
    private String status;
    private String reviewedBy;
    private String reviewedByName;
    private Instant reviewedAt;
    private Instant createdAt;
    private Instant updatedAt;
}
