-- Single-use, expiring account tokens for password reset and email verification.
--
-- Only the SHA-256 hash of each raw token is stored — never the token itself —
-- so a database leak does not expose usable reset/verification tokens.
-- Tokens are single-use (used_at) and expire (expires_at); at most one pending
-- token of a given type exists per user (reissuing replaces the previous one).

CREATE TABLE account_tokens (
    id         VARCHAR(36)  NOT NULL,
    user_id    VARCHAR(36)  NOT NULL,
    token_type VARCHAR(32)  NOT NULL,
    token_hash VARCHAR(64)  NOT NULL,
    expires_at DATETIME(6)  NOT NULL,
    used_at    DATETIME(6)  NULL,
    created_at DATETIME(6)  NOT NULL,
    updated_at DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_account_token_hash (token_hash),
    KEY idx_account_token_user (user_id, token_type)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
