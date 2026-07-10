package com.devsync.auth;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenProviderTest {

    private static final String SECRET = "this-is-a-very-long-secret-key-that-exceeds-256-bits-for-testing-purposes-only";
    private static final long EXPIRATION_MS = 3600000;      // 1 hour
    private static final long REFRESH_EXPIRATION_MS = 86400000; // 1 day

    private JwtTokenProvider provider;

    @BeforeEach
    void setUp() {
        provider = new JwtTokenProvider(SECRET, EXPIRATION_MS, REFRESH_EXPIRATION_MS);
    }

    @Test
    void generateAccessToken_shouldCreateValidToken() {
        String token = provider.generateAccessToken("user-id-123", "test@test.com");
        assertThat(token).isNotNull().isNotEmpty();
        assertThat(provider.validateToken(token)).isTrue();
    }

    @Test
    void generateRefreshToken_shouldCreateValidToken() {
        String token = provider.generateRefreshToken("user-id-123");
        assertThat(token).isNotNull().isNotEmpty();
        assertThat(provider.validateToken(token)).isTrue();
    }

    @Test
    void getUserIdFromToken_shouldReturnCorrectUserId() {
        String token = provider.generateAccessToken("user-id-456", "user@test.com");
        String extractedId = provider.getUserIdFromToken(token);
        assertThat(extractedId).isEqualTo("user-id-456");
    }

    @Test
    void validateToken_shouldRejectInvalidToken() {
        boolean valid = provider.validateToken("this-is-not-a-valid-jwt-token");
        assertThat(valid).isFalse();
    }

    @Test
    void validateToken_shouldRejectTamperedToken() {
        String token = provider.generateAccessToken("user-id", "test@test.com");
        String tampered = token.substring(0, token.length() - 5) + "AAAAA";
        assertThat(provider.validateToken(tampered)).isFalse();
    }
}
