-- =============================================
-- DevSync Database Schema - V16
-- Subscription billing (Razorpay, INR).
-- 1. plans           - configurable plan catalog with entitlement limits
--                      (seeded below; editable at runtime via UPDATE).
-- 2. subscriptions   - one active subscription row per user.
-- 3. payments        - safe payment ledger (provider references only -
--                      never card numbers/CVV/raw credentials).
-- 4. webhook_events  - idempotency ledger for provider webhooks
--                      (unique provider event id).
-- =============================================

CREATE TABLE plans (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(60) NOT NULL,
    description VARCHAR(255),
    price_inr INT NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    private_project_limit INT NULL COMMENT 'NULL = unlimited',
    members_per_project INT NOT NULL,
    storage_bytes BIGINT NOT NULL,
    advanced_analytics BOOLEAN NOT NULL DEFAULT FALSE,
    custom_domain BOOLEAN NOT NULL DEFAULT FALSE,
    sso BOOLEAN NOT NULL DEFAULT FALSE,
    audit_level VARCHAR(20) NOT NULL DEFAULT 'BASIC',
    priority_support BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT uk_plans_code UNIQUE (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE subscriptions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    plan_code VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    provider VARCHAR(20) NOT NULL DEFAULT 'RAZORPAY',
    provider_customer_id VARCHAR(100),
    provider_subscription_id VARCHAR(100),
    current_period_start DATETIME(6),
    current_period_end DATETIME(6),
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT uk_subscriptions_user UNIQUE (user_id),
    INDEX idx_subscriptions_status (status),
    INDEX idx_subscriptions_plan (plan_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payments (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    subscription_id VARCHAR(36),
    plan_code VARCHAR(20) NOT NULL,
    provider VARCHAR(20) NOT NULL DEFAULT 'RAZORPAY',
    provider_payment_id VARCHAR(100),
    provider_order_id VARCHAR(100),
    amount_paise BIGINT NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    paid_at DATETIME(6),
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT uk_payments_provider_payment UNIQUE (provider_payment_id),
    INDEX idx_payments_user (user_id, created_at),
    INDEX idx_payments_order (provider_order_id),
    INDEX idx_payments_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE webhook_events (
    id VARCHAR(36) PRIMARY KEY,
    provider VARCHAR(20) NOT NULL,
    provider_event_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(60) NOT NULL,
    payload MEDIUMTEXT,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    processed_at DATETIME(6),
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT uk_webhook_provider_event UNIQUE (provider, provider_event_id),
    INDEX idx_webhook_processed (processed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---- Seed the plan catalog --------------------------------------
-- Entitlements are configurable at runtime:
--   UPDATE plans SET private_project_limit = 5 WHERE code = 'FREE';
-- (NULL = unlimited; all limits are enforced server-side.)

INSERT INTO plans (id, code, name, description, price_inr, currency,
                   private_project_limit, members_per_project, storage_bytes,
                   advanced_analytics, custom_domain, sso, audit_level,
                   priority_support, is_active, created_at, updated_at) VALUES
('plan-free', 'FREE', 'Free', 'Start collaborating with core project tools.', 0, 'INR',
 2, 5, 1073741824, FALSE, FALSE, FALSE, 'BASIC', FALSE, TRUE, NOW(6), NOW(6)),
('plan-pro', 'PRO', 'Pro', 'More private projects, storage and advanced analytics.', 299, 'INR',
 20, 25, 53687091200, TRUE, FALSE, FALSE, 'FULL', TRUE, TRUE, NOW(6), NOW(6)),
('plan-enterprise', 'ENTERPRISE', 'Enterprise', 'Unlimited scale and enterprise controls.', 999, 'INR',
 NULL, 100, 268435456000, TRUE, FALSE, FALSE, 'ADVANCED', TRUE, TRUE, NOW(6), NOW(6));
