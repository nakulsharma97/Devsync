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
public class ReportResponse {
    private String id;
    private String entityType;
    private String entityId;
    private String reason;
    private String description;
    private String status;
    private Instant createdAt;
}
