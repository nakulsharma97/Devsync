-- =============================================
-- DevSync Database Schema - V11
-- GitHub integration: per-user OAuth connections
-- (access token stored ENCRYPTED, never plaintext)
-- and per-project repository links.
-- =============================================

CREATE TABLE github_connections (
    id                    VARCHAR(36)  NOT NULL PRIMARY KEY,
    user_id               VARCHAR(36)  NOT NULL,
    github_username       VARCHAR(255) NOT NULL,
    encrypted_access_token TEXT        NOT NULL,
    token_scopes          VARCHAR(255),
    connected_at          TIMESTAMP    NOT NULL,
    last_synced_at        TIMESTAMP,
    created_at            TIMESTAMP    NOT NULL,
    updated_at            TIMESTAMP    NOT NULL,
    CONSTRAINT uk_github_conn_user UNIQUE (user_id),
    INDEX idx_github_conn_user (user_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE project_github_links (
    id                 VARCHAR(36)  NOT NULL PRIMARY KEY,
    project_id         VARCHAR(36)  NOT NULL,
    repo_id            BIGINT       NOT NULL,
    repo_full_name     VARCHAR(255) NOT NULL,
    repo_url           VARCHAR(500) NOT NULL,
    repo_description   VARCHAR(1000),
    repo_visibility    VARCHAR(20),
    repo_language      VARCHAR(100),
    repo_default_branch VARCHAR(100),
    linked_by          VARCHAR(36)  NOT NULL,
    linked_at          TIMESTAMP    NOT NULL,
    created_at         TIMESTAMP    NOT NULL,
    updated_at         TIMESTAMP    NOT NULL,
    CONSTRAINT uk_pgl_project UNIQUE (project_id),
    CONSTRAINT uk_pgl_repo UNIQUE (repo_id),
    INDEX idx_pgl_project (project_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
