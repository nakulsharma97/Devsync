package com.devsync.auth;

import com.devsync.auth.entity.AccountToken;
import com.devsync.auth.entity.AccountTokenType;
import com.devsync.auth.repository.AccountTokenRepository;
import com.devsync.auth.repository.RefreshTokenRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import jakarta.servlet.http.Cookie;

import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end account recovery and email verification against the real stack
 * (H2, full Spring context). Emails are intercepted: the reset/verify link is
 * captured and its single-use token driven through the HTTP endpoints.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AccountRecoveryIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private RefreshTokenRepository refreshTokenRepository;
    @Autowired private AccountTokenRepository accountTokenRepository;
    @Autowired private AccountRecoveryService accountRecoveryService;

    @MockitoBean private EmailService emailService;

    private String userId;

    @BeforeEach
    void seed() {
        // The service's per-email rate limiter is a singleton — clear it so each
        // test starts with a fresh budget.
        accountRecoveryService.resetRateLimitsForTesting();
        userRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        User user = User.builder()
                .email("recover@test.dev")
                .password(passwordEncoder.encode("OldPass1!"))
                .fullName("Recover User")
                .username("recoveruser")
                .role(User.Role.USER)
                .authProvider("email")
                .build();
        userId = userRepository.save(user).getId();
    }

    // ── Helpers ────────────────────────────────────────────────────────

    private String captureResetLink() throws Exception {
        ArgumentCaptor<String> linkCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendPasswordResetEmail(org.mockito.ArgumentMatchers.eq("recover@test.dev"),
                linkCaptor.capture());
        return linkCaptor.getValue();
    }

    private String captureVerifyLink() throws Exception {
        ArgumentCaptor<String> linkCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendVerificationEmail(org.mockito.ArgumentMatchers.eq("recover@test.dev"),
                linkCaptor.capture());
        return linkCaptor.getValue();
    }

    private String tokenFrom(String link) {
        return link.substring(link.indexOf("token=") + "token=".length());
    }

    private MvcResult requestReset() throws Exception {
        return mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"recover@test.dev\"}"))
                .andExpect(status().isOk())
                .andReturn();
    }

    private void resetPassword(String token, String newPassword) throws Exception {
        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + token + "\",\"newPassword\":\"" + newPassword + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    private MvcResult login(String password) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"recover@test.dev\",\"password\":\"" + password + "\"}"))
                .andReturn();
    }

    private Cookie refreshCookieOf(MvcResult result) {
        return result.getResponse().getCookie(RefreshTokenCookie.NAME);
    }

    // ── Password reset ─────────────────────────────────────────────────

    @Test
    void forgotPassword_isGeneric_ForKnownAndUnknownEmails() throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"recover@test.dev\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"does-not-exist@test.dev\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // Only the existing account receives an email.
        verify(emailService, times(1)).sendPasswordResetEmail(
                org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void validReset_changesPassword_andAllowsLoginWithNewPassword() throws Exception {
        requestReset();
        String rawToken = tokenFrom(captureResetLink());
        resetPassword(rawToken, "NewPass1!");

        // Old password no longer works, new one does.
        assertThat(login("OldPass1!").getResponse().getStatus()).isEqualTo(401);
        MvcResult newLogin = login("NewPass1!");
        assertThat(newLogin.getResponse().getStatus()).isEqualTo(200);
        assertThat(refreshCookieOf(newLogin)).isNotNull();
    }

    @Test
    void reset_revokesExistingRefreshSessions() throws Exception {
        // Establish a session, then reset the password.
        MvcResult session = login("OldPass1!");
        assertThat(session.getResponse().getStatus()).isEqualTo(200);
        Cookie oldRefreshCookie = refreshCookieOf(session);
        assertThat(oldRefreshCookie).isNotNull();

        requestReset();
        resetPassword(tokenFrom(captureResetLink()), "NewPass1!");

        // Every refresh token for the user is revoked server-side.
        assertThat(refreshTokenRepository.findByUserIdAndRevokedAtIsNull(userId)).isEmpty();

        // And the old refresh cookie is now rejected.
        mockMvc.perform(post("/api/auth/refresh").cookie(oldRefreshCookie))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void reset_withExpiredToken_isRejected() throws Exception {
        requestReset();
        String rawToken = tokenFrom(captureResetLink());

        // Force the token to expire in the database.
        AccountToken stored = accountTokenRepository
                .findByUserIdAndTokenType(userId, AccountTokenType.PASSWORD_RESET).orElseThrow();
        stored.setExpiresAt(Instant.now().minusSeconds(60));
        accountTokenRepository.save(stored);

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + rawToken + "\",\"newPassword\":\"NewPass1!\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void reset_withReusedToken_isRejected() throws Exception {
        requestReset();
        String rawToken = tokenFrom(captureResetLink());

        resetPassword(rawToken, "NewPass1!"); // first use succeeds

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + rawToken + "\",\"newPassword\":\"Another1!\"}"))
                .andExpect(status().isUnauthorized());

        // The reused token must not change the password a second time.
        assertThat(login("Another1!").getResponse().getStatus()).isEqualTo(401);
        assertThat(login("NewPass1!").getResponse().getStatus()).isEqualTo(200);
    }

    @Test
    void reset_withInvalidToken_isRejected() throws Exception {
        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"not-a-real-token\",\"newPassword\":\"NewPass1!\"}"))
                .andExpect(status().isUnauthorized());
    }

    // ── Email verification ─────────────────────────────────────────────

    @Test
    void verifyEmail_validToken_marksAccountVerified() throws Exception {
        mockMvc.perform(post("/api/auth/email/verify/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"recover@test.dev\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        String rawToken = tokenFrom(captureVerifyLink());
        mockMvc.perform(post("/api/auth/email/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + rawToken + "\"}"))
                .andExpect(status().isOk());

        assertThat(userRepository.findById(userId).orElseThrow().isEmailVerified()).isTrue();
    }

    @Test
    void duplicateVerification_isHandledSafely() throws Exception {
        // First verification succeeds.
        mockMvc.perform(post("/api/auth/email/verify/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"recover@test.dev\"}"))
                .andExpect(status().isOk());
        String rawToken = tokenFrom(captureVerifyLink());
        mockMvc.perform(post("/api/auth/email/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + rawToken + "\"}"))
                .andExpect(status().isOk());

        // A second request does NOT email again (already verified)…
        mockMvc.perform(post("/api/auth/email/verify/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"recover@test.dev\"}"))
                .andExpect(status().isOk());
        verify(emailService, times(1)).sendVerificationEmail(
                org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString());

        // …and replaying the consumed token is rejected.
        mockMvc.perform(post("/api/auth/email/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + rawToken + "\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void emailVerification_isRateLimitedPerEmail() throws Exception {
        for (int i = 0; i < 6; i++) {
            mockMvc.perform(post("/api/auth/email/verify/request")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"email\":\"recover@test.dev\"}"))
                    .andExpect(status().isOk());
        }
        // Only the first 3 requests within the window emit emails; the rest are
        // silently skipped while still returning the generic success response.
        verify(emailService, times(3)).sendVerificationEmail(
                org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString());
        verify(emailService, never()).sendPasswordResetEmail(
                org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void verifyRequest_forUnknownEmail_isGenericAndSilent() throws Exception {
        mockMvc.perform(post("/api/auth/email/verify/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ghost@test.dev\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
        verify(emailService, never()).sendVerificationEmail(
                org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString());
    }
}
