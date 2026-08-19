-- =============================================
-- DevSync Database Schema - V22
-- Adds the support ticket system.
-- 1. support_tickets        - user support requests
-- 2. support_ticket_replies - replies on support tickets (user + admin)
-- =============================================

CREATE TABLE support_tickets (
    id VARCHAR(36) PRIMARY KEY,
    ticket_number VARCHAR(255) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    category VARCHAR(255),
    assigned_to VARCHAR(36),
    resolved_at DATETIME(6),
    closed_at DATETIME(6),
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT uk_support_tickets_number UNIQUE (ticket_number),
    INDEX idx_support_tickets_user (user_id),
    INDEX idx_support_tickets_status (status),
    INDEX idx_support_tickets_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE support_ticket_replies (
    id VARCHAR(36) PRIMARY KEY,
    ticket_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    message TEXT NOT NULL,
    is_admin_reply BOOLEAN NOT NULL DEFAULT FALSE,
    is_internal_note BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    INDEX idx_support_replies_ticket (ticket_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
