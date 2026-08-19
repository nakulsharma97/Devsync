package com.devsync.support.entity;

import com.devsync.common.BaseEntity;
import com.devsync.support.SupportTicketPriority;
import com.devsync.support.SupportTicketStatus;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "support_tickets", indexes = {
    @Index(name = "idx_support_tickets_user", columnList = "user_id"),
    @Index(name = "idx_support_tickets_status", columnList = "status"),
    @Index(name = "idx_support_tickets_priority", columnList = "priority")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SupportTicket extends BaseEntity {

    @Column(name = "ticket_number", unique = true, nullable = false)
    private String ticketNumber;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(nullable = false)
    private String subject;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private SupportTicketStatus status = SupportTicketStatus.OPEN;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private SupportTicketPriority priority = SupportTicketPriority.MEDIUM;

    @Column(name = "category")
    private String category; // BUG, FEATURE_REQUEST, ACCOUNT, BILLING, GENERAL

    @Column(name = "assigned_to")
    private String assignedTo;

    @Column(name = "resolved_at")
    private java.time.Instant resolvedAt;

    @Column(name = "closed_at")
    private java.time.Instant closedAt;
}
