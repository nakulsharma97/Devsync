package com.devsync.audit.entity;

import com.devsync.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog extends BaseEntity {

    @Column(name = "performed_by")
    private String performedBy;

    @Column(name = "target_user")
    private String targetUser;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuditAction action;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuditStatus status;

    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    @Column(length = 32)
    private String device;

    @Column(length = 32)
    private String browser;

    @Column(columnDefinition = "TEXT")
    private String details;
}
