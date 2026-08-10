package com.devsync.auth;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class OtpServiceTest {

    private OtpService otpService;

    @BeforeEach
    void setUp() {
        otpService = new OtpService();
        ReflectionTestUtils.setField(otpService, "expirationMinutes", 10);
    }

    @Test
    void validateOtp_shouldAcceptCorrectOtp() {
        String otp = otpService.generateOtp("user@test.com");
        assertThat(otp).isNotNull();
        assertThat(otpService.validateOtp("user@test.com", otp)).isTrue();
    }

    @Test
    void validateOtp_shouldRejectWrongOtp() {
        otpService.generateOtp("user@test.com");
        assertThat(otpService.validateOtp("user@test.com", "000000")).isFalse();
    }

    @Test
    void validateOtp_shouldBeSingleUse() {
        String otp = otpService.generateOtp("user@test.com");
        assertThat(otpService.validateOtp("user@test.com", otp)).isTrue();
        // Second use must fail — the OTP is burned after success.
        assertThat(otpService.validateOtp("user@test.com", otp)).isFalse();
    }

    @Test
    void validateOtp_shouldInvalidateAfterMaxFailedAttempts() {
        String otp = otpService.generateOtp("user@test.com");
        assertThat(otp).isNotNull();

        // 5 wrong guesses burn the OTP...
        for (int i = 0; i < 5; i++) {
            assertThat(otpService.validateOtp("user@test.com", "999999")).isFalse();
        }
        // ...even the correct code no longer works.
        assertThat(otpService.validateOtp("user@test.com", otp)).isFalse();
    }

    @Test
    void validateOtp_shouldAllowSomeFailedAttemptsBeforeLockout() {
        String otp = otpService.generateOtp("user@test.com");
        assertThat(otp).isNotNull();

        // Two wrong guesses, then the correct code still works.
        assertThat(otpService.validateOtp("user@test.com", "111111")).isFalse();
        assertThat(otpService.validateOtp("user@test.com", "222222")).isFalse();
        assertThat(otpService.validateOtp("user@test.com", otp)).isTrue();
    }

    @Test
    void generateOtp_shouldRateLimitPerEmail() {
        // First 5 generations succeed.
        for (int i = 0; i < 5; i++) {
            assertThat(otpService.generateOtp("limited@test.com")).isNotNull();
        }
        // Further generations within the window are silently refused.
        assertThat(otpService.generateOtp("limited@test.com")).isNull();
        // A different email is unaffected.
        assertThat(otpService.generateOtp("other@test.com")).isNotNull();
    }

    @Test
    void validateOtp_shouldRejectOtpForUnknownEmail() {
        assertThat(otpService.validateOtp("nobody@test.com", "123456")).isFalse();
    }
}
