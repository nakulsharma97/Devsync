package com.devsync.report.entity;

import com.devsync.common.BaseEntity;
import com.devsync.report.ReportEntityType;
import com.devsync.report.ReportReason;
import com.devsync.report.ReportStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "reports", indexes = {
        @Index(name = "idx_reports_status", columnList = "status"),
        @Index(name = "idx_reports_entity", columnList = "entity_type, entity_id"),
        @Index(name = "idx_reports_reporter", columnList = "reporter_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Report extends BaseEntity {

    @Column(name = "reporter_id", nullable = false)
    private String reporterId;

    @Enumerated(EnumType.STRING)
    @Column(name = "entity_type", nullable = false)
    private ReportEntityType entityType;

    @Column(name = "entity_id", nullable = false)
    private String entityId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReportReason reason;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ReportStatus status = ReportStatus.PENDING;

    @Column(name = "reviewed_by")
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;
}
