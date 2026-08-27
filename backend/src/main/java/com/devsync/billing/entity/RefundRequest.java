package com.devsync.billing.entity;

import com.devsync.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Self-serve refund request. A user submits a request against a successful
 * payment; an admin reviews and either approves (which calls Razorpay's
 * Refund API) or rejects with a note. The actual entitlement revocation
 * happens only when the refund.processed webhook fires — never directly
 * from the approve endpoint.
 */
@Entity
@Table(name = "refund_requests", indexes = {
        @Index(name = "idx_refund_requests_user", columnList = "user_id, created_at"),
        @Index(name = "idx_refund_requests_status", columnList = "status"),
        @Index(name = "idx_refund_requests_payment", columnList = "payment_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefundRequest extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "payment_id", nullable = false)
    private String paymentId;

    /** User-supplied reason for the refund request. */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private RefundRequestStatus status = RefundRequestStatus.PENDING;

    /** Admin note set on approve or reject. */
    @Column(columnDefinition = "TEXT")
    private String adminNote;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "reviewed_by_admin_id")
    private String reviewedByAdminId;
}
