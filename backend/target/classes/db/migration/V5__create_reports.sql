-- =============================================
-- DevSync Database Schema - V5
-- Adds the Reports & Moderation system.
-- 1. reports table (entity reports with status workflow)
-- 2. hidden flags on posts/comments/messages so admins
--    can moderate content without deleting data.
-- =============================================

CREATE TABLE reports (
    id VARCHAR(36) PRIMARY KEY,
    reporter_id VARCHAR(36) NOT NULL,
    entity_type VARCHAR(20) NOT NULL,
    entity_id VARCHAR(36) NOT NULL,
    reason VARCHAR(40) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    reviewed_by VARCHAR(36),
    reviewed_at DATETIME(6),
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    INDEX idx_reports_status (status),
    INDEX idx_reports_entity (entity_type, entity_id),
    INDEX idx_reports_reporter (reporter_id),
    INDEX idx_reports_created_at (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE feed_posts ADD COLUMN hidden BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE feed_comments ADD COLUMN hidden BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN hidden BOOLEAN NOT NULL DEFAULT FALSE;
