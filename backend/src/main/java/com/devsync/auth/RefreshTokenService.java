package com.devsync.auth;

import com.devsync.auth.entity.RefreshToken;
import com.devsync.auth.repository.RefreshTokenRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.UUID;

/**
 * Server-side registry for refresh tokens. The raw refresh token is never stored —
 * only its SHA-256 hash — so a database leak does not yield usable credentials.
 *
 * <ul>
 *   <li><b>Rotation</b>: every refresh exchange issues a new token and marks the
 *       presented one as replaced.</li>
 *   <li><b>Reuse detection</b>: presenting a token that was already rotated or
 *       revoked is treated as theft and revokes the entire family.</li>
 *   <li><b>Revocation</b>: logout revokes the presented token; blocking or deleting
 *       an account revokes all of its tokens immediately.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;

    @Transactional
    public String issue(String userId, String ipAddress, String userAgent) {
        String token = jwtTokenProvider.generateRefreshToken(userId);
        RefreshToken record = RefreshToken.builder()
                .userId(userId)
                .tokenHash(hash(token))
                .familyId(UUID.randomUUID().toString())
                .expiresAt(Instant.now().plusMillis(jwtTokenProvider.getRefreshExpirationMs()))
                .ipAddress(truncate(ipAddress, 64))
                .userAgent(truncate(userAgent, 255))
                .build();
        refreshTokenRepository.save(record);
        cleanupExpired();
        return token;
    }

    /**
     * Exchanges a refresh token for a new one (rotation).
     *
     * @throws AuthException for invalid/expired/unknown tokens and for accounts
     *                       that are blocked or deleted (family revoked on reuse).
     */
    @Transactional
    public String rotate(String token, String ipAddress, String userAgent) {
        if (!jwtTokenProvider.isRefreshToken(token)) {
            throw new AuthException("Invalid or expired refresh token");
        }
        String userId = jwtTokenProvider.getUserIdFromToken(token);
        String tokenHash = hash(token);

        RefreshToken record = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new AuthException("Invalid or expired refresh token"));

        // Reuse detection: this token was already rotated or revoked.
        if (record.isRevoked() || record.getReplacedBy() != null) {
            revokeFamily(record.getFamilyId());
            throw new AuthException("Refresh token reuse detected — session revoked");
        }
        if (record.isExpired()) {
            throw new AuthException("Invalid or expired refresh token");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AuthException("User not found"));
        ensureActive(user);
        if (!user.getId().equals(record.getUserId())) {
            throw new AuthException("Invalid or expired refresh token");
        }

        String newToken = jwtTokenProvider.generateRefreshToken(userId);
        RefreshToken replacement = RefreshToken.builder()
                .userId(userId)
                .tokenHash(hash(newToken))
                .familyId(record.getFamilyId())
                .expiresAt(Instant.now().plusMillis(jwtTokenProvider.getRefreshExpirationMs()))
                .ipAddress(truncate(ipAddress, 64))
                .userAgent(truncate(userAgent, 255))
                .build();
        refreshTokenRepository.save(replacement);

        record.setReplacedBy(replacement.getTokenHash());
        refreshTokenRepository.save(record);
        return newToken;
    }

    /** Revokes the presented token (logout). */
    @Transactional
    public void revoke(String token) {
        if (token == null || token.isBlank()) {
            return;
        }
        refreshTokenRepository.findByTokenHash(hash(token))
                .ifPresent(record -> {
                    record.setRevokedAt(Instant.now());
                    refreshTokenRepository.save(record);
                });
    }

    /** Immediately invalidates every refresh token of a user (block/delete). */
    @Transactional
    public void revokeAllForUser(String userId) {
        if (userId == null) {
            return;
        }
        refreshTokenRepository.revokeAllForUser(userId, Instant.now());
    }

    private void revokeFamily(String familyId) {
        for (RefreshToken member : refreshTokenRepository.findByFamilyId(familyId)) {
            if (!member.isRevoked()) {
                member.setRevokedAt(Instant.now());
            }
        }
        refreshTokenRepository.flush();
    }

    private void ensureActive(User user) {
        if (user.isDeleted()) {
            revokeAllForUser(user.getId());
            throw new AuthException("This account has been deleted", HttpStatus.FORBIDDEN);
        }
        if (user.isBlocked()) {
            revokeAllForUser(user.getId());
            throw new AuthException("Your account has been blocked. Please contact support.", HttpStatus.FORBIDDEN);
        }
    }

    /** Opportunistic cleanup so the table does not grow without bound. */
    private void cleanupExpired() {
        try {
            refreshTokenRepository.deleteExpired(Instant.now().minusSeconds(86400));
        } catch (Exception ignored) {
            // Cleanup must never break a login/refresh.
        }
    }

    static String hash(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) {
                sb.append(Character.forDigit((b >> 4) & 0xF, 16)).append(Character.forDigit(b & 0xF, 16));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    private String truncate(String value, int max) {
        if (value == null || value.length() <= max) {
            return value;
        }
        return value.substring(0, max);
    }
}
