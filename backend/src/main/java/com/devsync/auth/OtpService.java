package com.devsync.auth;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class OtpService {

    /** Max OTP requests per email per window */
    private static final int OTP_MAX_REQUESTS = 5;
    /** Rate limit window in minutes */
    private static final int OTP_RATE_LIMIT_WINDOW_MINUTES = 15;
    /** Max failed verification attempts before the OTP is invalidated */
    private static final int OTP_MAX_ATTEMPTS = 5;

    private final Map<String, OtpEntry> otpStore = new ConcurrentHashMap<>();
    private final Map<String, OtpRateLimit> otpRateLimitStore = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    @Value("${app.otp.expiration-minutes}")
    private int expirationMinutes;

    public String generateOtp(String email) {
        // Rate limit: check if too many OTPs requested recently
        OtpRateLimit rateLimit = otpRateLimitStore.get(email);
        if (rateLimit != null) {
            if (rateLimit.count >= OTP_MAX_REQUESTS
                    && Instant.now().isBefore(rateLimit.windowStart.plusSeconds(OTP_RATE_LIMIT_WINDOW_MINUTES * 60L))) {
                return null; // Silently refuse — don't reveal rate limiting is active
            }
            if (Instant.now().isAfter(rateLimit.windowStart.plusSeconds(OTP_RATE_LIMIT_WINDOW_MINUTES * 60L))) {
                otpRateLimitStore.put(email, new OtpRateLimit(Instant.now(), 1));
            } else {
                rateLimit.count++;
            }
        } else {
            otpRateLimitStore.put(email, new OtpRateLimit(Instant.now(), 1));
        }

        String otp = String.format("%06d", random.nextInt(1_000_000));
        otpStore.put(email, new OtpEntry(otp, Instant.now().plusSeconds(expirationMinutes * 60)));
        return otp;
    }

    public boolean validateOtp(String email, String otp) {
        OtpEntry entry = otpStore.get(email);
        if (entry == null) return false;
        if (Instant.now().isAfter(entry.expiresAt)) {
            otpStore.remove(email);
            return false;
        }
        // Constant-time comparison — avoids timing-based OTP guessing.
        boolean valid = MessageDigest.isEqual(
                entry.otp.getBytes(StandardCharsets.UTF_8),
                otp == null ? new byte[0] : otp.getBytes(StandardCharsets.UTF_8));
        if (valid) {
            otpStore.remove(email);
            return true;
        }
        // Brute-force protection: after a handful of failures the OTP is burned.
        entry.failedAttempts++;
        if (entry.failedAttempts >= OTP_MAX_ATTEMPTS) {
            otpStore.remove(email);
        }
        return false;
    }

    /** Mutable holder so failed attempts can be counted against a single OTP. */
    private static class OtpEntry {
        final String otp;
        final Instant expiresAt;
        int failedAttempts;

        OtpEntry(String otp, Instant expiresAt) {
            this.otp = otp;
            this.expiresAt = expiresAt;
        }
    }

    /** Tracks number of OTP requests within a rate limit window */
    private static class OtpRateLimit {
        final Instant windowStart;
        int count;

        OtpRateLimit(Instant windowStart, int count) {
            this.windowStart = windowStart;
            this.count = count;
        }
    }
}
