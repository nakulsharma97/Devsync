package com.devsync.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.env.Environment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductionConfigValidatorTest {

    private static final String STRONG_SECRET =
            "correct-horse-battery-staple-2026-0123456789-abcdef";

    @Mock private Environment environment;

    private ProductionConfigValidator validator;

    @BeforeEach
    void setUp() {
        validator = new ProductionConfigValidator(environment);
    }

    /**
     * Missing properties resolve to null, like an unset environment variable.
     * The catch-all must be registered BEFORE the specific keys (Mockito returns
     * the last matching stub).
     */
    private void withDefaults() {
        when(environment.getProperty(anyString())).thenReturn(null);
        set("app.jwt.secret", STRONG_SECRET);
        set("spring.datasource.password", "s3cr3t-db-pass");
        set("app.admin.seed-enabled", "false");
    }

    private void set(String key, String value) {
        when(environment.getProperty(key)).thenReturn(value);
    }

    @Test
    void validConfiguration_passes() {
        withDefaults();
        assertThatCode(validator::validate).doesNotThrowAnyException();
    }

    @Test
    void missingJwtSecret_failsFast() {
        withDefaults();
        set("app.jwt.secret", null);
        assertThatThrownBy(validator::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET");
    }

    @Test
    void knownDevJwtFallback_failsFast() {
        withDefaults();
        set("app.jwt.secret", "devsync-local-development-only-secret-not-for-production");
        assertThatThrownBy(validator::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("known development fallback");
    }

    @Test
    void oldKnownDevJwtFallback_failsFast() {
        withDefaults();
        set("app.jwt.secret", "devsync-default-secret-key-for-local-development-only-change-in-prod");
        assertThatThrownBy(validator::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("known development fallback");
    }

    @Test
    void shortJwtSecret_failsFast() {
        withDefaults();
        set("app.jwt.secret", "too-short");
        assertThatThrownBy(validator::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("at least 32 characters");
    }

    @Test
    void missingDbPassword_failsFast() {
        withDefaults();
        set("spring.datasource.password", null);
        assertThatThrownBy(validator::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("SPRING_DATASOURCE_PASSWORD");
    }

    @Test
    void knownDevDbPassword_failsFast() {
        withDefaults();
        set("spring.datasource.password", "12345");
        assertThatThrownBy(validator::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("known local-development value");
    }

    @Test
    void halfConfiguredSmtp_failsFast() {
        withDefaults();
        set("spring.mail.username", "ops@example.com");
        // password stays null -> mismatched pair
        assertThatThrownBy(validator::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("MAIL_USERNAME and MAIL_PASSWORD");
    }

    @Test
    void adminSeedingWithoutCredentials_failsFast() {
        withDefaults();
        set("app.admin.seed-enabled", "true");
        assertThatThrownBy(validator::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("DEVSYNC_ADMIN_EMAIL");
    }

    @Test
    void halfConfiguredGithub_failsFast() {
        withDefaults();
        set("app.github.client-id", "gh-client-id");
        assertThatThrownBy(validator::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET");
    }

    @Test
    void githubEnabledWithoutRedirectUri_failsFast() {
        withDefaults();
        set("app.github.client-id", "gh-client-id");
        set("app.github.client-secret", "gh-client-secret");
        assertThatThrownBy(validator::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("GITHUB_REDIRECT_URI");
    }

    @Test
    void halfConfiguredOAuthLogin_failsFast() {
        withDefaults();
        set("spring.security.oauth2.client.registration.google.client-id", "google-id");
        assertThatThrownBy(validator::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET");
    }

    @Test
    void errorMessagesNeverContainSecretValues() {
        withDefaults();
        set("app.jwt.secret", "devsync-local-development-only-secret-not-for-production");
        set("spring.datasource.password", "12345");
        assertThatThrownBy(validator::validate)
                .isInstanceOf(IllegalStateException.class)
                .satisfies(ex -> {
                    String message = ex.getMessage();
                    assertThat(message).doesNotContain("devsync-local-development-only-secret-not-for-production");
                    assertThat(message).doesNotContain("12345");
                });
    }
}
