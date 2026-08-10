-- Server-side refresh token registry.
--
-- Enables: rotation (old token marked replaced), reuse detection (a rotated or
-- revoked token presented again revokes the whole family), logout revocation and
-- immediate invalidation when an account is blocked or deleted.
--
-- Only the SHA-256 hash of each refresh token is stored — never the token itself,
-- so a database leak does not expose usable refresh tokens.

CREATE TABLE refresh_tokens (
    id            VARCHAR(36)  NOT NULL,
    user_id       VARCHAR(36)  NOT NULL,
    token_hash    VARCHAR(64)  NOT NULL,
    family_id     VARCHAR(36)  NOT NULL,
    expires_at    DATETIME(6)  NOT NULL,
    revoked_at    DATETIME(6)  NULL,
    replaced_by   VARCHAR(64)  NULL,
    ip_address    VARCHAR(64)  NULL,
    user_agent    VARCHAR(255) NULL,
    created_at    DATETIME(6)  NOT NULL,
    updated_at    DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_refresh_token_hash (token_hash),
    KEY idx_refresh_user (user_id),
    KEY idx_refresh_family (family_id),
    KEY idx_refresh_expires (expires_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
