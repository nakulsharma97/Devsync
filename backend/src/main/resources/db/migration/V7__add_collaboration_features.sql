-- =============================================
-- DevSync Database Schema - V7
-- Phase 6: Collaboration features.
-- 1. project_invitations - invite users by username/email (PENDING/ACCEPTED/DECLINED/EXPIRED)
-- 2. join_requests - requests to join PRIVATE projects (PENDING/APPROVED/REJECTED)
-- 3. file_attachments - shared files for chat / posts / comments
-- 4. users presence columns - online/away/offline + last seen
-- 5. messages.attachment_id - link a message to an uploaded file
-- =============================================

CREATE TABLE project_invitations (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    sender_id VARCHAR(36) NOT NULL,
    receiver_id VARCHAR(36) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    message VARCHAR(500),
    expires_at DATETIME(6) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    INDEX idx_inv_project (project_id),
    INDEX idx_inv_receiver (receiver_id, status),
    INDEX idx_inv_sender (sender_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE join_requests (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    message VARCHAR(500),
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT uk_join_request UNIQUE (project_id, user_id),
    INDEX idx_jr_project (project_id, status),
    INDEX idx_jr_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE file_attachments (
    id VARCHAR(36) PRIMARY KEY,
    uploader_id VARCHAR(36) NOT NULL,
    project_id VARCHAR(36),
    context_type VARCHAR(30) NOT NULL,
    context_id VARCHAR(36),
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100),
    size BIGINT NOT NULL,
    url VARCHAR(500) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    INDEX idx_att_uploader (uploader_id),
    INDEX idx_att_context (context_type, context_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE users
    ADD COLUMN last_active_at DATETIME(6) NULL,
    ADD COLUMN presence_status VARCHAR(16) NOT NULL DEFAULT 'OFFLINE';

ALTER TABLE messages
    ADD COLUMN attachment_id VARCHAR(36) NULL;
