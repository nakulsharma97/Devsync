-- =============================================
-- DevSync Database Schema - V29
-- Self-serve refund requests.
-- =============================================

CREATE TABLE refund_requests (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    payment_id VARCHAR(36) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    admin_note TEXT,
    reviewed_at DATETIME(6),
    reviewed_by_admin_id VARCHAR(36),
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    INDEX idx_refund_requests_user (user_id, created_at),
    INDEX idx_refund_requests_status (status),
    INDEX idx_refund_requests_payment (payment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
