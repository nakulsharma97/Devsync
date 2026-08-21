-- Pending registrations for email verification during signup.
-- Stores the registration data temporarily until the user verifies their email.
CREATE TABLE pending_registrations (
    id              VARCHAR(36) PRIMARY KEY,
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    username        VARCHAR(255),
    otp_hash        VARCHAR(64) NOT NULL,
    expires_at      DATETIME(6) NOT NULL,
    failed_attempts INT NOT NULL DEFAULT 0,
    created_at      DATETIME(6) NOT NULL,
    updated_at      DATETIME(6) NOT NULL,
    CONSTRAINT uk_pending_reg_email UNIQUE (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
