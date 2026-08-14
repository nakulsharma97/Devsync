package com.devsync.billing.entity;

import com.devsync.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Payment ledger. Only provider references and safe metadata are stored —
 * never card numbers, CVV or raw payment credentials.
 */
@Entity
@Table(name = "payments", indexes = {
        @Index(name = "idx_payments_user", columnList = "user_id, created_at"),
        @Index(name = "idx_payments_order", columnList = "provider_order_id"),
        @Index(name = "idx_payments_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "subscription_id")
    private String subscriptionId;

    /** Plan this payment purchased (set at checkout; never from the webhook). */
    @Column(name = "plan_code", nullable = false)
    private String planCode;

    @Column(nullable = false)
    @Builder.Default
    private String provider = "RAZORPAY";

    @Column(name = "provider_payment_id", unique = true)
    private String providerPaymentId;

    @Column(name = "provider_order_id")
    private String providerOrderId;

    @Column(name = "amount_paise", nullable = false)
    private long amountPaise;

    @Column(nullable = false)
    @Builder.Default
    private String currency = "INR";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private PaymentStatus status = PaymentStatus.PENDING;

    @Column(name = "paid_at")
    private Instant paidAt;
}
