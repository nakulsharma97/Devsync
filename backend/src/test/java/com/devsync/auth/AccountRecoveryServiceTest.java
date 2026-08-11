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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountRecoveryServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private AccountTokenRepository tokenRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private EmailService emailService;
    @Mock private RefreshTokenService refreshTokenService;
    @Mock private AuditLogService auditLogService;

    private AccountRecoveryService service;

    @BeforeEach
    void setUp() {
        service = new AccountRecoveryService(userRepository, tokenRepository, passwordEncoder,
                emailService, refreshTokenService, auditLogService);
        ReflectionTestUtils.setField(service, "expirationMinutes", 15);
        ReflectionTestUtils.setField(service, "frontendUrl", "http://localhost:5173");
    }

    private User existingUser(String id, String email) {
        User user = User.builder().email(email).fullName("Test").password("old").authProvider("email").build();
        user.setId(id);
        return user;
    }

    /** Extracts the raw token from a reset/verify link. */
    private String tokenFrom(String link) {
        return link.substring(link.indexOf("token=") + "token=".length());
    }

    /**
     * Issues a reset token for the user and wires the repository lookup so a
     * subsequent resetPassword() call can consume it. Returns the raw token.
     */
    private String issueResetTokenFor(User user) {
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(tokenRepository.save(any(AccountToken.class))).thenAnswer(inv -> inv.getArgument(0));
        service.requestPasswordReset(user.getEmail());
        ArgumentCaptor<String> linkCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendPasswordResetEmail(eq(user.getEmail()), linkCaptor.capture());
        String rawToken = tokenFrom(linkCaptor.getValue());
        AccountToken issued = captureStoredToken();
        when(tokenRepository.findByTokenHash(RefreshTokenService.hash(rawToken))).thenReturn(Optional.of(issued));
        return rawToken;
    }

    /** Returns the most recently saved token record. */
    private AccountToken captureStoredToken() {
        ArgumentCaptor<AccountToken> captor = ArgumentCaptor.forClass(AccountToken.class);
        verify(tokenRepository, atLeastOnce()).save(captor.capture());
        return captor.getValue();
    }

    // ── Password reset ─────────────────────────────────────────────────

    @Test
    void requestPasswordReset_forExistingUser_storesHashAndEmailsLink() {
        User user = existingUser("u1", "alice@test.dev");
        when(userRepository.findByEmail("alice@test.dev")).thenReturn(Optional.of(user));
        when(tokenRepository.save(any(AccountToken.class))).thenAnswer(inv -> inv.getArgument(0));

        service.requestPasswordReset("alice@test.dev");

        ArgumentCaptor<String> linkCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendPasswordResetEmail(eq("alice@test.dev"), linkCaptor.capture());
        String rawToken = tokenFrom(linkCaptor.getValue());
        assertThat(rawToken).isNotBlank();

        ArgumentCaptor<AccountToken> tokenCaptor = ArgumentCaptor.forClass(AccountToken.class);
        verify(tokenRepository).save(tokenCaptor.capture());
        AccountToken stored = tokenCaptor.getValue();
        assertThat(stored.getTokenType()).isEqualTo(AccountTokenType.PASSWORD_RESET);
        assertThat(stored.getUserId()).isEqualTo("u1");
        // Only the SHA-256 hash is persisted — never the raw token.
        assertThat(stored.getTokenHash()).isNotEqualTo(rawToken);
        assertThat(stored.getTokenHash()).isEqualTo(RefreshTokenService.hash(rawToken));
        assertThat(stored.getExpiresAt()).isAfter(Instant.now());
        assertThat(stored.getUsedAt()).isNull();
    }

    @Test
    void requestPasswordReset_forUnknownEmail_doesNothing() {
        when(userRepository.findByEmail("ghost@test.dev")).thenReturn(Optional.empty());

        service.requestPasswordReset("ghost@test.dev");

        verify(tokenRepository, never()).save(any());
        verify(emailService, never()).sendPasswordResetEmail(anyString(), anyString());
    }

    @Test
    void requestPasswordReset_rateLimited_silentlySkips() {
        User user = existingUser("u1", "spam@test.dev");
        when(userRepository.findByEmail("spam@test.dev")).thenReturn(Optional.of(user));
        when(tokenRepository.save(any(AccountToken.class))).thenAnswer(inv -> inv.getArgument(0));

        for (int i = 0; i < 6; i++) {
            service.requestPasswordReset("spam@test.dev");
        }

        // Only the first 3 requests (per-email window) produce emails.
        verify(emailService, times(3)).sendPasswordResetEmail(eq("spam@test.dev"), anyString());
    }

    @Test
    void resetPassword_validToken_updatesPasswordAndRevokesSessions() {
        User user = existingUser("u1", "alice@test.dev");
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("NewPass1!")).thenReturn("encoded-new");

        String rawToken = issueResetTokenFor(user);

        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setToken(rawToken);
        request.setNewPassword("NewPass1!");

        service.resetPassword(request);

        assertThat(user.getPassword()).isEqualTo("encoded-new");
        verify(refreshTokenService).revokeAllForUser("u1");
        verify(auditLogService).record(eq("u1"), eq("u1"), eq(AuditAction.PASSWORD_RESET),
                eq(AuditStatus.SUCCESS), anyString());
        // Single-use: the consumed token record carries a usedAt timestamp.
        assertThat(captureStoredToken().getUsedAt()).isNotNull();
    }

    @Test
    void resetPassword_reusedToken_rejected() {
        User user = existingUser("u1", "alice@test.dev");
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(passwordEncoder.encode(anyString())).thenReturn("encoded");

        String rawToken = issueResetTokenFor(user);
        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setToken(rawToken);
        request.setNewPassword("NewPass1!");

        service.resetPassword(request); // first use succeeds

        assertThatThrownBy(() -> service.resetPassword(request))
                .isInstanceOf(AuthException.class)
                .hasMessageContaining("Invalid or expired");
        // Password was not overwritten by the second attempt.
        verify(passwordEncoder, times(1)).encode(anyString());
    }

    @Test
    void resetPassword_expiredToken_rejectedAndBurned() {
        when(tokenRepository.findByTokenHash(anyString())).thenAnswer(inv -> {
            AccountToken expired = AccountToken.builder()
                    .userId("u1").tokenType(AccountTokenType.PASSWORD_RESET)
                    .tokenHash(inv.getArgument(0))
                    .expiresAt(Instant.now().minusSeconds(60))
                    .build();
            expired.setId("t-expired");
            return Optional.of(expired);
        });

        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setToken("some-token");
        request.setNewPassword("NewPass1!");

        assertThatThrownBy(() -> service.resetPassword(request))
                .isInstanceOf(AuthException.class)
                .hasMessageContaining("Invalid or expired");
        verify(tokenRepository).delete(any(AccountToken.class));
        verify(refreshTokenService, never()).revokeAllForUser(anyString());
    }

    @Test
    void resetPassword_invalidToken_rejected() {
        when(tokenRepository.findByTokenHash(anyString())).thenReturn(Optional.empty());

        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setToken("garbage-token");
        request.setNewPassword("NewPass1!");

        assertThatThrownBy(() -> service.resetPassword(request))
                .isInstanceOf(AuthException.class)
                .hasMessageContaining("Invalid or expired");
        verify(refreshTokenService, never()).revokeAllForUser(anyString());
    }

    @Test
    void resetPassword_deletedUser_rejected() {
        User user = existingUser("u1", "alice@test.dev");
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));

        String rawToken = issueResetTokenFor(user);
        user.setDeleted(true); // account deleted after the token was issued
        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setToken(rawToken);
        request.setNewPassword("NewPass1!");

        assertThatThrownBy(() -> service.resetPassword(request))
                .isInstanceOf(AuthException.class)
                .hasMessageContaining("Invalid or expired");
        verify(refreshTokenService, never()).revokeAllForUser(anyString());
    }

    // ── Email verification ─────────────────────────────────────────────

    @Test
    void requestEmailVerification_sendsLink_OnlyForUnverifiedUser() {
        User user = existingUser("u1", "alice@test.dev");
        user.setEmailVerified(false);
        when(userRepository.findByEmail("alice@test.dev")).thenReturn(Optional.of(user));
        when(tokenRepository.save(any(AccountToken.class))).thenAnswer(inv -> inv.getArgument(0));

        service.requestEmailVerification("alice@test.dev");

        ArgumentCaptor<String> linkCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendVerificationEmail(eq("alice@test.dev"), linkCaptor.capture());
        assertThat(linkCaptor.getValue()).contains("/verify-email?token=");
    }

    @Test
    void requestEmailVerification_skipsAlreadyVerified() {
        User user = existingUser("u1", "alice@test.dev");
        user.setEmailVerified(true);
        when(userRepository.findByEmail("alice@test.dev")).thenReturn(Optional.of(user));

        service.requestEmailVerification("alice@test.dev");

        verify(emailService, never()).sendVerificationEmail(anyString(), anyString());
        verify(tokenRepository, never()).save(any());
    }

    @Test
    void verifyEmail_validToken_marksVerified() {
        User user = existingUser("u1", "alice@test.dev");
        user.setEmailVerified(false);
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));

        String rawToken = issueVerificationToken(user);

        service.verifyEmail(rawToken);

        assertThat(user.isEmailVerified()).isTrue();
        verify(auditLogService).record(eq("u1"), eq("u1"), eq(AuditAction.EMAIL_VERIFIED),
                eq(AuditStatus.SUCCESS), anyString());
    }

    @Test
    void verifyEmail_alreadyVerified_isIdempotent() {
        User user = existingUser("u1", "alice@test.dev");
        user.setEmailVerified(false);
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));

        String rawToken = issueVerificationToken(user);
        user.setEmailVerified(true); // account already verified via another path

        // Verifying again must succeed (no exception) and not re-audit.
        service.verifyEmail(rawToken);

        verify(auditLogService, never()).record(any(), any(), eq(AuditAction.EMAIL_VERIFIED), any(), anyString());
    }

    @Test
    void verifyEmail_reusedToken_rejected() {
        User user = existingUser("u1", "alice@test.dev");
        user.setEmailVerified(false);
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));

        String rawToken = issueVerificationToken(user);

        service.verifyEmail(rawToken); // first use

        assertThatThrownBy(() -> service.verifyEmail(rawToken))
                .isInstanceOf(AuthException.class)
                .hasMessageContaining("Invalid or expired");
    }

    private String issueVerificationToken(User user) {
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(tokenRepository.save(any(AccountToken.class))).thenAnswer(inv -> inv.getArgument(0));
        service.requestEmailVerification(user.getEmail());
        ArgumentCaptor<String> linkCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendVerificationEmail(eq(user.getEmail()), linkCaptor.capture());
        String rawToken = tokenFrom(linkCaptor.getValue());
        AccountToken issued = captureStoredToken();
        when(tokenRepository.findByTokenHash(RefreshTokenService.hash(rawToken))).thenReturn(Optional.of(issued));
        return rawToken;
    }
}
