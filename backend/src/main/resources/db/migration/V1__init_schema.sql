-- ============================================================
-- DevSync Schema — V1: Initial Schema
-- ============================================================
-- Generated from JPA entities. Matches what Hibernate ddl-auto
-- would create, but now under Flyway's versioned control.
-- ============================================================

CREATE TABLE users (
    id          VARCHAR(36)  NOT NULL PRIMARY KEY,
    email       VARCHAR(255) NOT NULL,
    password    VARCHAR(255) NOT NULL,
    full_name   VARCHAR(255) NOT NULL,
    username    VARCHAR(255) UNIQUE,
    avatar_url  VARCHAR(512),
    bio         TEXT,
    job_title   VARCHAR(255),
    company     VARCHAR(255),
    location    VARCHAR(255),
    github_url  VARCHAR(512),
    twitter_url VARCHAR(512),
    website_url VARCHAR(512),
    role        VARCHAR(20)  NOT NULL DEFAULT 'USER',
    email_verified BOOLEAN   NOT NULL DEFAULT FALSE,
    auth_provider VARCHAR(50) NOT NULL DEFAULT 'email',
    last_login_at TIMESTAMP NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_users_email ON users(email);

CREATE TABLE projects (
    id             VARCHAR(36)  NOT NULL PRIMARY KEY,
    name           VARCHAR(255) NOT NULL,
    description    TEXT,
    owner_id       VARCHAR(36)  NOT NULL,
    status         VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    repository_url VARCHAR(512),
    image_url      VARCHAR(512),
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_project_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE project_members (
    id         VARCHAR(36) NOT NULL PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    user_id    VARCHAR(36) NOT NULL,
    role       VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_member_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_member_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    UNIQUE KEY uq_project_member (project_id, user_id)
);

CREATE TABLE feed_posts (
    id         VARCHAR(36)  NOT NULL PRIMARY KEY,
    content    TEXT         NOT NULL,
    image_url  VARCHAR(512),
    post_type  VARCHAR(20)  NOT NULL DEFAULT 'TEXT',
    user_id    VARCHAR(36)  NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_post_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE feed_comments (
    id         VARCHAR(36) NOT NULL PRIMARY KEY,
    content    TEXT        NOT NULL,
    post_id    VARCHAR(36) NOT NULL,
    user_id    VARCHAR(36) NOT NULL,
    created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_comment_post FOREIGN KEY (post_id) REFERENCES feed_posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_user FOREIGN KEY (user_id) REFERENCES users(id)    ON DELETE CASCADE
);

CREATE TABLE feed_post_likes (
    id         VARCHAR(36) NOT NULL PRIMARY KEY,
    post_id    VARCHAR(36) NOT NULL,
    user_id    VARCHAR(36) NOT NULL,
    created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_like_post FOREIGN KEY (post_id) REFERENCES feed_posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_like_user FOREIGN KEY (user_id) REFERENCES users(id)     ON DELETE CASCADE,
    UNIQUE KEY uq_post_like (post_id, user_id)
);

CREATE TABLE messages (
    id              VARCHAR(36)  NOT NULL PRIMARY KEY,
    content         TEXT         NOT NULL,
    sender_id       VARCHAR(36)  NOT NULL,
    recipient_id    VARCHAR(36)  NULL,
    room_id         VARCHAR(36)  NULL,
    message_type    VARCHAR(20)  NOT NULL DEFAULT 'TEXT',
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_msg_sender    FOREIGN KEY (sender_id)    REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_msg_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_room      ON messages(room_id);
CREATE INDEX idx_messages_sender    ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);

CREATE TABLE notifications (
    id          VARCHAR(36)  NOT NULL PRIMARY KEY,
    type        VARCHAR(50)  NOT NULL,
    title       VARCHAR(255) NOT NULL,
    message     TEXT,
    user_id     VARCHAR(36)  NOT NULL,
    sender_id   VARCHAR(36)  NULL,
    read        BOOLEAN      NOT NULL DEFAULT FALSE,
    entity_type VARCHAR(50),
    entity_id   VARCHAR(36),
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_user   FOREIGN KEY (user_id)   REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notif_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read);

CREATE TABLE team_rooms (
    id          VARCHAR(36)  NOT NULL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    created_by  VARCHAR(36)  NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_room_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE team_room_participants (
    id         VARCHAR(36) NOT NULL PRIMARY KEY,
    room_id    VARCHAR(36) NOT NULL,
    user_id    VARCHAR(36) NOT NULL,
    role       VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    joined_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_participant_room FOREIGN KEY (room_id) REFERENCES team_rooms(id) ON DELETE CASCADE,
    CONSTRAINT fk_participant_user FOREIGN KEY (user_id) REFERENCES users(id)     ON DELETE CASCADE,
    UNIQUE KEY uq_room_participant (room_id, user_id)
);

CREATE TABLE kanban_boards (
    id          VARCHAR(36)  NOT NULL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    project_id  VARCHAR(36),
    created_by  VARCHAR(36)  NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_board_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    CONSTRAINT fk_board_creator  FOREIGN KEY (created_by) REFERENCES users(id)   ON DELETE CASCADE
);

CREATE TABLE kanban_columns (
    id         VARCHAR(36)  NOT NULL PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    position   INT          NOT NULL DEFAULT 0,
    board_id   VARCHAR(36)  NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_column_board FOREIGN KEY (board_id) REFERENCES kanban_boards(id) ON DELETE CASCADE
);

CREATE TABLE kanban_tasks (
    id          VARCHAR(36)  NOT NULL PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    position    INT          NOT NULL DEFAULT 0,
    column_id   VARCHAR(36)  NOT NULL,
    assignee_id VARCHAR(36)  NULL,
    priority    VARCHAR(20)  NOT NULL DEFAULT 'MEDIUM',
    due_date    DATE         NULL,
    created_by  VARCHAR(36)  NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_task_column   FOREIGN KEY (column_id)   REFERENCES kanban_columns(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_assignee FOREIGN KEY (assignee_id)  REFERENCES users(id)          ON DELETE SET NULL,
    CONSTRAINT fk_task_creator  FOREIGN KEY (created_by)   REFERENCES users(id)          ON DELETE CASCADE
);
