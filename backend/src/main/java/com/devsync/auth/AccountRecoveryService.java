package com.devsync.auth;

import com.devsync.audit.AuditLogService;
import com.devsync.audit.entity.AuditAction;
import com.devsync.audit.entity.AuditStatus;
import com.devsync.auth.dto.ResetPasswordRequest;
import com.devsync.auth.entity.AccountToken;
import com.devsync.auth.entity.AccountTokenType;
import com.devsync.auth.repository.AccountTokenRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Account recovery and email verification.
 *
 * <p>Design notes:</p>
 * <ul>
 *   <li>Password reset and email verification both use <b>short-lived,
 *       single-use tokens</b>. Only the SHA-256 hash of each token is stored —
 *       the raw token is sent in the email and never logged or persisted.</li>
 *   <li>{@code requestPasswordReset} and {@code requestEmailVerification}
 *       <b>always succeed generically</b> (whether or not the email exists) so
 *       the endpoints cannot be used to enumerate accounts.</li>
 *   <li>Requests are <b>rate-limited per email</b> (silently refused beyond the
 *       limit — never revealed to the caller), in addition to the global
 *       per-IP auth limiter.</li>
 *   <li>Successful password reset <b>revokes every refresh session</b> of the
 *       account (existing rotation/revocation machinery is reused), forcing a
 *       fresh login.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class AccountRecoveryService {

    /** Max token requests per email per window — mirrors the OTP limiter. */
    private static final int MAX_REQUESTS = 3;
    /** Rate limit window in minutes. */
    private static final int RATE_LIMIT_WINDOW_MINUTES = 15;

    private final UserRepository userRepository;
    private final AccountTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final RefreshTokenService refreshTokenService;
    private final AuditLogService auditLogService;

    private static final Logger log = LoggerFactory.getLogger(AccountRecoveryService.class);

    private final Map<String, RateLimitEntry> rateLimitStore = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    @Value("${app.account-token.expiration-minutes:15}")
    private int expirationMinutes;

    @Value("${app.account-token.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    // ── Password reset ─────────────────────────────────────────────────

    /**
     * Issues a single-use reset token and emails a link. Always returns normally
     * (the caller must respond generically) — unknown emails are silently ignored
     * so the endpoint cannot enumerate accounts.
     */
    @Transactional
    public void requestPasswordReset(String email) {
        if (!allowRequest(email)) {
            return; // rate limited — silently refuse
        }
        userRepository.findByEmail(email).ifPresent(user -> {
            if (user.isDeleted()) return;
            String rawToken = issueToken(user.getId(), AccountTokenType.PASSWORD_RESET);
            try {
                emailService.sendPasswordResetEmail(user.getEmail(),
                        frontendUrl + "/reset-password?token=" + rawToken);
            } catch (Exception e) {
                // The raw token must never be logged; the request still succeeds
                // generically. A failed delivery just means no email arrives.
                log.warn("Failed to send password reset email");
            }
        });
    }

    /**
     * Consumes the token, sets a new password and revokes every refresh session.
     *
     * @throws AuthException with a generic message for unknown, expired, reused
     *                       or invalid tokens — never reveals account state.
     */
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        AccountToken token = consumeToken(request.getToken(), AccountTokenType.PASSWORD_RESET);
        User user = userRepository.findById(token.getUserId())
                .orElseThrow(() -> new AuthException("Invalid or expired reset token"));
        if (user.isDeleted()) {
            throw new AuthException("Invalid or expired reset token");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        // Invalidate every existing refresh session — the account must log in again.
        refreshTokenService.revokeAllForUser(user.getId());

        auditLogService.record(user.getId(), user.getId(), AuditAction.PASSWORD_RESET,
                AuditStatus.SUCCESS, "Password reset completed");
    }

    // ── Email verification ─────────────────────────────────────────────

    /**
     * Sends a verification link to an unverified account. Always returns normally;
     * already-verified accounts, unknown accounts and rate-limited emails are
     * silently skipped.
     */
    @Transactional
    public void requestEmailVerification(String email) {
        if (!allowRequest(email)) {
            return;
        }
        userRepository.findByEmail(email).ifPresent(user -> {
            if (user.isDeleted() || user.isBlocked() || user.isEmailVerified()) return;
            String rawToken = issueToken(user.getId(), AccountTokenType.EMAIL_VERIFICATION);
            try {
                emailService.sendVerificationEmail(user.getEmail(),
                        frontendUrl + "/verify-email?token=" + rawToken);
            } catch (Exception e) {
                log.warn("Failed to send verification email");
            }
        });
    }

    /**
     * Consumes the token and marks the account verified. Duplicate verification
     * is idempotent: verifying an already-verified account still succeeds.
     */
    @Transactional
    public void verifyEmail(String token) {
        AccountToken accountToken = consumeToken(token, AccountTokenType.EMAIL_VERIFICATION);
        User user = userRepository.findById(accountToken.getUserId())
                .orElseThrow(() -> new AuthException("Invalid or expired verification token"));
        if (user.isDeleted() || user.isBlocked()) {
            throw new AuthException("Invalid or expired verification token");
        }
        if (!user.isEmailVerified()) {
            user.setEmailVerified(true);
            userRepository.save(user);
            auditLogService.record(user.getId(), user.getId(), AuditAction.EMAIL_VERIFIED,
                    AuditStatus.SUCCESS, "Email verified");
        }
    }

    // ── Shared token machinery ─────────────────────────────────────────

    /**
     * Generates a random token, stores only its hash and invalidates any
     * previous pending token of the same type for the user (single active
     * token per type — reissuing replaces the earlier one).
     */
    private String issueToken(String userId, AccountTokenType type) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        tokenRepository.deleteByUserIdAndType(userId, type);
        tokenRepository.save(AccountToken.builder()
                .userId(userId)
                .tokenType(type)
                .tokenHash(RefreshTokenService.hash(rawToken))
                .expiresAt(Instant.now().plusSeconds(expirationMinutes * 60L))
                .build());
        return rawToken;
    }

    /**
     * Looks up and consumes a token. Single-use: once consumed (usedAt set) the
     * same token is rejected on every later attempt.
     */
    private AccountToken consumeToken(String rawToken, AccountTokenType type) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new AuthException("Invalid or expired token");
        }
        AccountToken token = tokenRepository.findByTokenHash(RefreshTokenService.hash(rawToken))
                .orElseThrow(() -> new AuthException("Invalid or expired token"));
        if (token.getTokenType() != type) {
            throw new AuthException("Invalid or expired token");
        }
        if (token.isUsed()) {
            throw new AuthException("Invalid or expired token");
        }
        if (token.isExpired()) {
            // Burn expired tokens so they cannot be retried.
            tokenRepository.delete(token);
            throw new AuthException("Invalid or expired token");
        }
        token.setUsedAt(Instant.now());
        tokenRepository.save(token);
        return token;
    }

    /** Test hook: clears the in-memory per-email rate-limit state. */
    void resetRateLimitsForTesting() {
        rateLimitStore.clear();
    }

    /** Per-email sliding-window limiter; returns false once the limit is hit. */
    private boolean allowRequest(String email) {
        if (email == null) return false;
        String key = email.toLowerCase();
        Instant now = Instant.now();
        RateLimitEntry entry = rateLimitStore.get(key);
        if (entry == null) {
            rateLimitStore.put(key, new RateLimitEntry(now, 1));
            return true;
        }
        if (now.isAfter(entry.windowStart.plusSeconds(RATE_LIMIT_WINDOW_MINUTES * 60L))) {
            rateLimitStore.put(key, new RateLimitEntry(now, 1));
            return true;
        }
        if (entry.count >= MAX_REQUESTS) {
            return false;
        }
        entry.count++;
        return true;
    }

    private static class RateLimitEntry {
        final Instant windowStart;
        int count;

        RateLimitEntry(Instant windowStart, int count) {
            this.windowStart = windowStart;
            this.count = count;
        }
    }
}
