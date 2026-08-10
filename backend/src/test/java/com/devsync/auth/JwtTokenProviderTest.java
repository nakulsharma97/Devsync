package com.devsync.auth;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenProviderTest {

    private static final String SECRET = "this-is-a-very-long-secret-key-that-exceeds-256-bits-for-testing-purposes-only";
    private static final String ISSUER = "devsync";
    private static final long EXPIRATION_MS = 3600000;      // 1 hour
    private static final long REFRESH_EXPIRATION_MS = 86400000; // 1 day

    private JwtTokenProvider provider;

    @BeforeEach
    void setUp() {
        provider = new JwtTokenProvider(SECRET, EXPIRATION_MS, REFRESH_EXPIRATION_MS, ISSUER);
    }

    @Test
    void generateAccessToken_shouldCreateValidToken() {
        String token = provider.generateAccessToken("user-id-123", "test@test.com");
        assertThat(token).isNotNull().isNotEmpty();
        assertThat(provider.validateToken(token)).isTrue();
        assertThat(provider.isAccessToken(token)).isTrue();
    }

    @Test
    void generateRefreshToken_shouldCreateValidToken() {
        String token = provider.generateRefreshToken("user-id-123");
        assertThat(token).isNotNull().isNotEmpty();
        assertThat(provider.validateToken(token)).isTrue();
        assertThat(provider.isRefreshToken(token)).isTrue();
    }

    @Test
    void refreshToken_shouldNeverBeAcceptedAsAccessToken() {
        String refresh = provider.generateRefreshToken("user-id-123");
        // Cryptographically valid, unexpired, correct issuer — but the wrong type.
        assertThat(provider.validateToken(refresh)).isTrue();
        assertThat(provider.isAccessToken(refresh)).isFalse();
    }

    @Test
    void accessToken_shouldNeverBeAcceptedAsRefreshToken() {
        String access = provider.generateAccessToken("user-id-123", "test@test.com");
        assertThat(provider.validateToken(access)).isTrue();
        assertThat(provider.isRefreshToken(access)).isFalse();
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

    @Test
    void validateToken_shouldRejectExpiredToken() {
        String expired = Jwts.builder()
                .issuer(ISSUER)
                .subject("user-id")
                .claim("type", "access")
                .issuedAt(new Date(System.currentTimeMillis() - 10_000))
                .expiration(new Date(System.currentTimeMillis() - 5_000))
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();
        assertThat(provider.validateToken(expired)).isFalse();
        assertThat(provider.isAccessToken(expired)).isFalse();
    }

    @Test
    void validateToken_shouldRejectWrongIssuer() {
        String wrongIssuer = Jwts.builder()
                .issuer("attacker-issuer")
                .subject("user-id")
                .claim("type", "access")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + EXPIRATION_MS))
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();
        assertThat(provider.validateToken(wrongIssuer)).isFalse();
        assertThat(provider.isAccessToken(wrongIssuer)).isFalse();
    }

    @Test
    void validateToken_shouldRejectTokenSignedWithDifferentKey() {
        String forged = Jwts.builder()
                .issuer(ISSUER)
                .subject("user-id")
                .claim("type", "access")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + EXPIRATION_MS))
                .signWith(Keys.hmacShaKeyFor(
                        "a-completely-different-secret-key-that-is-also-long-enough-for-hmac-sha-256".getBytes(StandardCharsets.UTF_8)))
                .compact();
        assertThat(provider.validateToken(forged)).isFalse();
        assertThat(provider.isAccessToken(forged)).isFalse();
    }
}
