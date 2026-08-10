package com.devsync.auth;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtTokenProvider {

    public static final String TOKEN_TYPE_ACCESS = "access";
    public static final String TOKEN_TYPE_REFRESH = "refresh";

    private final SecretKey key;
    private final long expirationMs;
    private final long refreshExpirationMs;
    private final String issuer;

    public JwtTokenProvider(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms}") long expirationMs,
            @Value("${app.jwt.refresh-expiration-ms}") long refreshExpirationMs,
            @Value("${app.jwt.issuer:devsync}") String issuer) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
        this.refreshExpirationMs = refreshExpirationMs;
        this.issuer = issuer;
    }

    public String generateAccessToken(String userId, String email) {
        return Jwts.builder()
                .issuer(issuer)
                .subject(userId)
                .claim("type", TOKEN_TYPE_ACCESS)
                .claim("email", email)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(key)
                .compact();
    }

    public String generateRefreshToken(String userId) {
        return Jwts.builder()
                .issuer(issuer)
                .subject(userId)
                .id(UUID.randomUUID().toString()) // unique jti — guarantees per-token uniqueness
                .claim("type", TOKEN_TYPE_REFRESH)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + refreshExpirationMs))
                .signWith(key)
                .compact();
    }

    public long getRefreshExpirationMs() {
        return refreshExpirationMs;
    }

    public String getUserIdFromToken(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .requireIssuer(issuer)
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

    /**
     * Validates signature, expiration and issuer. Does NOT check the token type.
     */
    public boolean validateToken(String token) {
        try {
            Jwts.parser().verifyWith(key).requireIssuer(issuer).build().parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    /**
     * True only for valid, unexpired access tokens. Refresh tokens must NEVER be
     * accepted as access tokens (they are valid for much longer).
     */
    public boolean isAccessToken(String token) {
        return hasType(token, TOKEN_TYPE_ACCESS);
    }

    /**
     * True only for valid, unexpired refresh tokens. Access tokens must not be
     * accepted on the refresh endpoint.
     */
    public boolean isRefreshToken(String token) {
        return hasType(token, TOKEN_TYPE_REFRESH);
    }

    private boolean hasType(String token, String expectedType) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .requireIssuer(issuer)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return expectedType.equals(claims.get("type", String.class));
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
