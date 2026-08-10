-- =============================================
-- DevSync Database Schema - V6
-- Adds the Activity Tracking & Audit Logging system.
-- 1. activities table - user-facing event timeline (project/user feeds)
-- 2. audit_logs table - security-sensitive event log for admins
-- =============================================

CREATE TABLE activities (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    project_id VARCHAR(36),
    activity_type VARCHAR(40) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    metadata TEXT,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    INDEX idx_activities_project_created (project_id, created_at),
    INDEX idx_activities_user_created (user_id, created_at),
    INDEX idx_activities_type (activity_type),
    INDEX idx_activities_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    performed_by VARCHAR(36),
    target_user VARCHAR(36),
    action VARCHAR(40) NOT NULL,
    ip_address VARCHAR(64),
    device VARCHAR(32),
    browser VARCHAR(32),
    status VARCHAR(16) NOT NULL,
    details TEXT,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    INDEX idx_audit_action_created (action, created_at),
    INDEX idx_audit_performed_by (performed_by),
    INDEX idx_audit_target_user (target_user),
    INDEX idx_audit_status (status),
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
