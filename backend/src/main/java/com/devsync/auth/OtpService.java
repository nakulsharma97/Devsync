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

    private final Map<String, OtpEntry> otpStore = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    @Value("${app.otp.expiration-minutes}")
    private int expirationMinutes;

    public String generateOtp(String email) {
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
}
