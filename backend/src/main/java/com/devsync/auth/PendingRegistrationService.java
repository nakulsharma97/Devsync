package com.devsync.auth;

import com.devsync.auth.entity.PendingRegistration;
import com.devsync.auth.repository.PendingRegistrationRepository;
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class PendingRegistrationService {

    private final PendingRegistrationRepository pendingRegistrationRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final SecureRandom random = new SecureRandom();

    @Value("${app.otp.expiration-minutes:10}")
    private int otpExpirationMinutes;

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int RESEND_COOLDOWN_SECONDS = 60;

    /**
     * Initiate registration by creating a pending registration and sending OTP.
     * Throws if SMTP is not configured or email sending fails, so the frontend
     * can display a meaningful error instead of silently pretending the OTP was sent.
     */
    @Transactional
    public void initiateRegistration(String email, String password, String fullName, String username) {
        // Reject immediately if the email already has a real account — no OTP sent.
        if (userRepository.countByEmail(email) > 0) {
            throw new AuthException("Email already in use");
        }
        // Reject immediately if the username is already taken.
        if (username != null && !username.isBlank() && userRepository.countByUsername(username) > 0) {
            throw new AuthException("Username already taken");
        }

        // Check if email already exists in pending registrations
        Optional<PendingRegistration> existing = pendingRegistrationRepository.findByEmail(email);
        if (existing.isPresent()) {
            PendingRegistration pending = existing.get();
            // If expired, delete and recreate
            if (pending.isExpired()) {
                pendingRegistrationRepository.delete(pending);
            } else {
                // Resend OTP if within cooldown
                resendOtp(email);
                return;
            }
        }

        // Generate OTP
        String otp = generateOtp();
        String otpHash = hashOtp(otp);
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(otpExpirationMinutes);

        // Create pending registration
        PendingRegistration pending = new PendingRegistration(
            email,
            passwordEncoder.encode(password),
            fullName,
            username,
            otpHash,
            expiresAt
        );
        pendingRegistrationRepository.save(pending);

        // Send OTP email — throws if SMTP is not configured or sending fails
        emailService.sendOtpEmail(email, otp);
        log.info("Registration initiated for email: {}, OTP sent", email);
    }

    /**
     * Verify OTP and return the pending registration for account creation.
     * The caller is responsible for creating the user and deleting the pending registration.
     */
    @Transactional
    public PendingRegistration verifyOtp(String email, String otp) {
        Optional<PendingRegistration> pendingOpt = pendingRegistrationRepository.findByEmail(email);
        if (pendingOpt.isEmpty()) {
            throw new AuthException("No pending registration found for this email. Please register again.");
        }

        PendingRegistration pending = pendingOpt.get();

        // Check if expired
        if (pending.isExpired()) {
            pendingRegistrationRepository.delete(pending);
            throw new AuthException("OTP has expired. Please register again.");
        }

        // Check failed attempts
        if (pending.getFailedAttempts() >= MAX_FAILED_ATTEMPTS) {
            pendingRegistrationRepository.delete(pending);
            throw new AuthException("Too many failed attempts. Please register again.");
        }

        // Verify OTP using constant-time comparison
        String otpHash = hashOtp(otp);
        if (!MessageDigest.isEqual(
                pending.getOtpHash().getBytes(StandardCharsets.UTF_8),
                otpHash.getBytes(StandardCharsets.UTF_8))) {
            pending.incrementFailedAttempts();
            pendingRegistrationRepository.save(pending);
            int remaining = MAX_FAILED_ATTEMPTS - pending.getFailedAttempts();
            throw new AuthException("Invalid verification code. " + remaining + " attempt" + (remaining == 1 ? "" : "s") + " remaining.");
        }

        // OTP is valid - return the pending registration for account creation
        return pending;
    }

    /**
     * Delete a pending registration after the account has been created.
     */
    @Transactional
    public void completeRegistration(PendingRegistration pending) {
        pendingRegistrationRepository.delete(pending);
    }

    /**
     * Resend OTP for a pending registration. Generates a new OTP, invalidates
     * the previous one, and sends the new code to the same email.
     */
    @Transactional
    public void resendOtp(String email) {
        Optional<PendingRegistration> pendingOpt = pendingRegistrationRepository.findByEmail(email);
        if (pendingOpt.isEmpty()) {
            throw new AuthException("No pending registration found for this email. Please register again.");
        }

        PendingRegistration pending = pendingOpt.get();

        // Check if expired
        if (pending.isExpired()) {
            pendingRegistrationRepository.delete(pending);
            throw new AuthException("Registration expired. Please register again.");
        }

        // Check cooldown — updatedAt is an Instant from BaseEntity
        if (pending.getUpdatedAt() != null) {
            long secondsSinceLastUpdate = Instant.now().getEpochSecond() - pending.getUpdatedAt().getEpochSecond();
            if (secondsSinceLastUpdate < RESEND_COOLDOWN_SECONDS) {
                throw new AuthException("Please wait " + (RESEND_COOLDOWN_SECONDS - secondsSinceLastUpdate) + " seconds before requesting a new code.");
            }
        }

        // Generate new OTP (invalidates the previous one)
        String otp = generateOtp();
        String otpHash = hashOtp(otp);
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(otpExpirationMinutes);

        // Update pending registration
        pending.setOtpHash(otpHash);
        pending.setExpiresAt(expiresAt);
        pending.setFailedAttempts(0);
        pendingRegistrationRepository.save(pending);

        // Send new OTP email — throws if SMTP is not configured or sending fails
        emailService.sendOtpEmail(email, otp);
        log.info("OTP resent for email: {}", email);
    }

    /**
     * Clean up expired pending registrations.
     */
    @Scheduled(fixedRate = 3_600_000) // every hour
    @Transactional
    public void cleanupExpiredRegistrations() {
        pendingRegistrationRepository.findAll().stream()
            .filter(PendingRegistration::isExpired)
            .forEach(pendingRegistrationRepository::delete);
    }

    private String generateOtp() {
        return String.format("%06d", random.nextInt(1_000_000));
    }

    private String hashOtp(String otp) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(otp.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Failed to hash OTP", e);
        }
    }
}
