package com.devsync.billing.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * A billing plan and its entitlement limits. Seeded by the V16 migration and a
 * startup seeder (test environments). All limits are enforced server-side by
 * {@code EntitlementService}; the values are configurable at runtime via the
 * database (UPDATE plans SET ... WHERE code = 'PRO').
 */
@Entity
@Table(name = "plans")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Plan {

    @Id
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String description;

    @Column(name = "price_inr", nullable = false)
    private int priceInr;

    @Column(nullable = false)
    @Builder.Default
    private String currency = "INR";

    /** NULL means unlimited. */
    @Column(name = "private_project_limit")
    private Integer privateProjectLimit;

    @Column(name = "members_per_project", nullable = false)
    private int membersPerProject;

    @Column(name = "storage_bytes", nullable = false)
    private long storageBytes;

    @Column(name = "advanced_analytics", nullable = false)
    @Builder.Default
    private boolean advancedAnalytics = false;

    @Column(name = "custom_domain", nullable = false)
    @Builder.Default
    private boolean customDomain = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean sso = false;

    @Column(name = "audit_level", nullable = false)
    @Builder.Default
    private String auditLevel = "BASIC";

    @Column(name = "priority_support", nullable = false)
    @Builder.Default
    private boolean prioritySupport = false;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    /** How this plan is billed. ONE_TIME = fixed-period with manual renewal;
     *  RECURRING = automatic Stripe subscription. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private BillingMode billingMode = BillingMode.ONE_TIME;

    /** Stripe Price ID for this plan (e.g. price_xxx). Used for Stripe
     *  subscription checkouts. NULL for ONE_TIME plans or if Stripe is not
     *  configured. */
    @Column(name = "stripe_price_id")
    private String stripePriceId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private java.time.Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private java.time.Instant updatedAt;
}
