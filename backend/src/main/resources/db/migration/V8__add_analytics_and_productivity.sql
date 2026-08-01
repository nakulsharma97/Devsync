-- =============================================
-- DevSync Database Schema - V8
-- Phase 7: Analytics & productivity.
-- 1. bookmarks - save projects/tasks/posts/users
-- 2. pinned_projects - pin up to 5 favourite projects
-- 3. recent_searches - per-user search history
-- 4. task indexes for filtering/calendar views
-- =============================================

CREATE TABLE bookmarks (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    entity_type VARCHAR(30) NOT NULL,
    entity_id VARCHAR(36) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT uk_bookmark UNIQUE (user_id, entity_type, entity_id),
    INDEX idx_bookmarks_user (user_id, created_at),
    INDEX idx_bookmarks_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pinned_projects (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    project_id VARCHAR(36) NOT NULL,
    position INT NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT uk_pinned UNIQUE (user_id, project_id),
    INDEX idx_pinned_user (user_id, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE recent_searches (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    keyword VARCHAR(255) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    INDEX idx_recent_user (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE tasks
    ADD INDEX idx_tasks_due_date (due_date),
    ADD INDEX idx_tasks_priority (priority),
    ADD INDEX idx_tasks_assignee (assignee_id);
