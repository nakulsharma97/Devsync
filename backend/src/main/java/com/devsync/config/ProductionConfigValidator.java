package com.devsync.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Fail-fast startup validation for the {@code prod} profile.
 *
 * <p>Aborts application startup when critical secrets are missing or when a known
 * development fallback value is detected (e.g. the dev JWT secret or the local
 * MySQL password {@code 12345}). The validator only ever logs the <b>names</b> of
 * offending variables — values are never printed.</p>
 *
 * <p>This runs on top of Spring's placeholder resolution: {@code application-prod.yml}
 * declares required secrets as {@code ${VAR}} placeholders <i>without defaults</i>,
 * so a missing variable already fails startup before this bean is created. This
 * class catches the cases placeholders cannot: known dev values, weak lengths,
 * and inconsistent pairs (SMTP, GitHub, admin seeding).</p>
 */
@Component
@Profile("prod")
public class ProductionConfigValidator {

    private static final Logger log = LoggerFactory.getLogger(ProductionConfigValidator.class);

    /** Development-only fallback values that are never acceptable in production. */
    static final String DEV_JWT_SECRET = "devsync-local-development-only-secret-not-for-production";
    static final String OLD_DEV_JWT_SECRET = "devsync-default-secret-key-for-local-development-only-change-in-prod";
    static final String DEV_DB_PASSWORD = "12345";

    private final Environment environment;

    public ProductionConfigValidator(Environment environment) {
        this.environment = environment;
    }

    @PostConstruct
    public void validate() {
        List<String> problems = new ArrayList<>();

        // JWT signing secret.
        String jwtSecret = environment.getProperty("app.jwt.secret");
        if (isBlank(jwtSecret)) {
            problems.add("JWT_SECRET is required");
        } else if (jwtSecret.length() < 32) {
            problems.add("JWT_SECRET must be at least 32 characters");
        } else if (DEV_JWT_SECRET.equals(jwtSecret) || OLD_DEV_JWT_SECRET.equals(jwtSecret)) {
            problems.add("JWT_SECRET is set to a known development fallback value");
        }

        // Database password.
        String dbPassword = environment.getProperty("spring.datasource.password");
        if (isBlank(dbPassword)) {
            problems.add("SPRING_DATASOURCE_PASSWORD is required");
        } else if (DEV_DB_PASSWORD.equals(dbPassword)) {
            problems.add("SPRING_DATASOURCE_PASSWORD is set to the known local-development value");
        }

        // SMTP: both credentials or neither.
        String mailUser = environment.getProperty("spring.mail.username");
        String mailPassword = environment.getProperty("spring.mail.password");
        if (isBlank(mailUser) != isBlank(mailPassword)) {
            problems.add("MAIL_USERNAME and MAIL_PASSWORD must be configured together (SMTP)");
        }

        // Admin seeding: never enabled without explicit credentials.
        if ("true".equalsIgnoreCase(environment.getProperty("app.admin.seed-enabled"))) {
            if (isBlank(environment.getProperty("app.admin.seed-email"))) {
                problems.add("DEVSYNC_ADMIN_EMAIL is required when DEVSYNC_ADMIN_SEED_ENABLED=true");
            }
            if (isBlank(environment.getProperty("app.admin.seed-password"))) {
                problems.add("DEVSYNC_ADMIN_PASSWORD is required when DEVSYNC_ADMIN_SEED_ENABLED=true");
            }
        }

        // GitHub integration: client id/secret pair, plus a real redirect URI.
        String ghClientId = environment.getProperty("app.github.client-id");
        String ghClientSecret = environment.getProperty("app.github.client-secret");
        if (isBlank(ghClientId) != isBlank(ghClientSecret)) {
            problems.add("GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be configured together (GitHub integration)");
        } else if (!isBlank(ghClientId) && isBlank(environment.getProperty("app.github.redirect-uri"))) {
            problems.add("GITHUB_REDIRECT_URI is required when the GitHub integration is enabled");
        }

        // OAuth login providers (spring.security.oauth2.client.*, e.g. the `oauth` profile).
        if (isBlank(environment.getProperty("spring.security.oauth2.client.registration.github.client-id"))
                != isBlank(environment.getProperty("spring.security.oauth2.client.registration.github.client-secret"))) {
            problems.add("GitHub OAuth login requires both GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET");
        }
        if (isBlank(environment.getProperty("spring.security.oauth2.client.registration.google.client-id"))
                != isBlank(environment.getProperty("spring.security.oauth2.client.registration.google.client-secret"))) {
            problems.add("Google OAuth login requires both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET");
        }

        if (!problems.isEmpty()) {
            for (String problem : problems) {
                log.error("Production configuration error: {}", problem);
            }
            // The exception message lists only variable NAMES — values are never included.
            throw new IllegalStateException("Production startup aborted: " + problems.size()
                    + " configuration problem(s): " + String.join("; ", problems));
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
