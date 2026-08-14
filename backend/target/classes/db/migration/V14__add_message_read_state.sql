-- =============================================
-- DevSync Database Schema - V14
-- Message read state.
-- 1. messages.status  - SENT / DELIVERED / READ (per-message lifecycle).
-- 2. messages.read_at - when the message was read (DM recipient).
-- 3. message_reads    - per-user read receipts for room messages
--                       (a room message is "read" per participant).
-- =============================================

ALTER TABLE messages
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'SENT',
    ADD COLUMN read_at DATETIME(6) NULL;

CREATE TABLE message_reads (
    id VARCHAR(36) PRIMARY KEY,
    message_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    read_at DATETIME(6) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT uk_message_read UNIQUE (message_id, user_id),
    INDEX idx_mr_user (user_id),
    INDEX idx_mr_message (message_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
