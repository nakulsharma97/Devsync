package com.devsync.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Typed configuration for the bootstrap admin account.
 *
 * <p>Seeding is opt-in: it only runs when {@code seed-enabled} is explicitly set to
 * {@code true}. In production this should always be disabled unless the operator
 * explicitly provides credentials via environment variables.
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.admin")
public class AdminProperties {

    /**
     * Whether to seed the configured admin account on startup.
     * Defaults to {@code false} - never enabled implicitly.
     */
    private boolean seedEnabled = false;

    /**
     * Email of the bootstrap admin account (e.g. {@code DEVSYNC_ADMIN_EMAIL}).
     * Required when {@link #seedEnabled} is {@code true}.
     */
    private String seedEmail = "";

    /**
     * Plaintext password of the bootstrap admin account (e.g. {@code DEVSYNC_ADMIN_PASSWORD}).
     * Required when {@link #seedEnabled} is {@code true}. Never logged, never exposed via
     * any API; always BCrypt-encoded before being persisted.
     */
    private String seedPassword = "";
}
