-- =============================================
-- DevSync Database Schema - V15
-- Adds the public Review & private Feedback system.
-- 1. reviews - user reviews that can appear on the landing page
--    after admin approval (one active review per user)
-- 2. feedback - private product feedback, visible only to admins
-- =============================================

CREATE TABLE reviews (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    rating INT NOT NULL,
    title VARCHAR(120),
    comment TEXT NOT NULL,
    category VARCHAR(40) NOT NULL DEFAULT 'OVERALL_EXPERIENCE',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    moderated_by VARCHAR(36),
    moderated_at DATETIME(6),
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT uk_reviews_user UNIQUE (user_id),
    INDEX idx_reviews_status (status),
    INDEX idx_reviews_status_created (status, created_at DESC),
    INDEX idx_reviews_featured (status, is_featured, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE feedback (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    category VARCHAR(40) NOT NULL,
    message TEXT NOT NULL,
    rating INT,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    admin_note TEXT,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    INDEX idx_feedback_user (user_id, created_at),
    INDEX idx_feedback_status (status),
    INDEX idx_feedback_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
