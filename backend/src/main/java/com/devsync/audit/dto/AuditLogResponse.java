package com.devsync.audit.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogResponse {
    private String id;
    private String performedBy;
    private String performedByName;
    private String targetUserId;
    private String targetUserName;
    private String action;
    private String status;
    private String ipAddress;
    private String device;
    private String browser;
    private String details;
    private Instant createdAt;
}
