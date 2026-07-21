package com.devsync.auth;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

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
        if (Instant.now().isAfter(entry.expiresAt())) {
            otpStore.remove(email);
            return false;
        }
        boolean valid = entry.otp().equals(otp);
        if (valid) otpStore.remove(email);
        return valid;
    }

    private record OtpEntry(String otp, Instant expiresAt) {}

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
