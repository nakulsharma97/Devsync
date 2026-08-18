-- =============================================================
-- DevSync Database Schema - V21
-- Social follow relationships:
--   follower_id  - the user who follows
--   following_id - the user being followed
-- One-directional; a unique constraint guarantees a user can
-- follow another user at most once.
-- =============================================================

CREATE TABLE user_follows (
    id VARCHAR(36) PRIMARY KEY,
    follower_id VARCHAR(36) NOT NULL,
    following_id VARCHAR(36) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT uk_user_follow UNIQUE (follower_id, following_id),
    INDEX idx_uf_follower (follower_id),
    INDEX idx_uf_following (following_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
