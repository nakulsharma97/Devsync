-- =============================================
-- DevSync Database Schema - V17
-- Collaboration upgrades:
-- 1. messages   - reply threads (parent_message_id), edit state.
-- 2. message_reactions - per-user emoji reactions on messages.
-- 3. tasks      - milestone / sprint grouping fields.
-- 4. task_dependencies - task-blocking graph (cycle-checked in service).
-- 5. project_notes - per-project shared Markdown doc (Yjs state + version).
-- =============================================

ALTER TABLE messages
    ADD COLUMN parent_message_id VARCHAR(36) NULL,
    ADD COLUMN edited BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN edited_at DATETIME(6) NULL,
    ADD INDEX idx_messages_parent (parent_message_id);

CREATE TABLE message_reactions (
    id VARCHAR(36) PRIMARY KEY,
    message_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    emoji VARCHAR(32) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT uk_message_reaction UNIQUE (message_id, user_id, emoji),
    INDEX idx_mr_message (message_id),
    INDEX idx_mr_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE tasks
    ADD COLUMN milestone VARCHAR(120) NULL,
    ADD COLUMN sprint VARCHAR(120) NULL;

CREATE TABLE task_dependencies (
    id VARCHAR(36) PRIMARY KEY,
    task_id VARCHAR(36) NOT NULL,
    depends_on_id VARCHAR(36) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT uk_task_dependency UNIQUE (task_id, depends_on_id),
    INDEX idx_td_depends_on (depends_on_id),
    INDEX idx_td_task (task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE project_notes (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    yjs_state LONGBLOB NULL,
    version BIGINT NOT NULL DEFAULT 0,
    updated_by VARCHAR(36),
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT uk_project_notes_project UNIQUE (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
