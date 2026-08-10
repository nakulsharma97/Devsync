package com.devsync.auth;

import com.devsync.auth.entity.RefreshToken;
import com.devsync.auth.repository.RefreshTokenRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

    @Mock private JwtTokenProvider jwtTokenProvider;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private UserRepository userRepository;

    private RefreshTokenService refreshTokenService;

    @BeforeEach
    void setUp() {
        refreshTokenService = new RefreshTokenService(jwtTokenProvider, refreshTokenRepository, userRepository);
        lenient().when(jwtTokenProvider.getRefreshExpirationMs()).thenReturn(2_592_000_000L);
    }

    private User activeUser(String id) {
        User user = User.builder().email(id + "@test.dev").fullName("U").build();
        user.setId(id);
        return user;
    }

    private RefreshToken record(String hash, String family, String userId, boolean revoked, boolean replaced) {
        RefreshToken rt = RefreshToken.builder()
                .userId(userId)
                .tokenHash(hash)
                .familyId(family)
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();
        rt.setId("rt-" + hash);
        if (revoked) rt.setRevokedAt(Instant.now());
        if (replaced) rt.setReplacedBy("next-hash");
        return rt;
    }

    @Test
    void issue_shouldStoreOnlyTheHash() {
        when(jwtTokenProvider.generateRefreshToken("user-1")).thenReturn("raw-token-value");
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));

        String token = refreshTokenService.issue("user-1", "1.2.3.4", "browser");

        assertThat(token).isEqualTo("raw-token-value");
        ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository).save(captor.capture());
        RefreshToken saved = captor.getValue();
        // The raw token must never be persisted.
        assertThat(saved.getTokenHash()).isNotEqualTo("raw-token-value");
        assertThat(saved.getTokenHash()).isEqualTo(RefreshTokenService.hash("raw-token-value"));
        assertThat(saved.getIpAddress()).isEqualTo("1.2.3.4");
    }

    @Test
    void rotate_shouldIssueNewTokenInSameFamily_AndMarkOldAsReplaced() {
        String oldToken = "old-refresh-token";
        String oldHash = RefreshTokenService.hash(oldToken);
        RefreshToken oldRecord = record(oldHash, "family-1", "user-1", false, false);

        when(jwtTokenProvider.isRefreshToken(oldToken)).thenReturn(true);
        when(jwtTokenProvider.getUserIdFromToken(oldToken)).thenReturn("user-1");
        when(refreshTokenRepository.findByTokenHash(oldHash)).thenReturn(Optional.of(oldRecord));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(activeUser("user-1")));
        when(jwtTokenProvider.generateRefreshToken("user-1")).thenReturn("new-refresh-token");
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));

        String newToken = refreshTokenService.rotate(oldToken, null, null);

        assertThat(newToken).isEqualTo("new-refresh-token");
        // Old record points at its replacement (rotation chain).
        assertThat(oldRecord.getReplacedBy()).isEqualTo(RefreshTokenService.hash("new-refresh-token"));
        ArgumentCaptor<RefreshToken> saved = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository, times(2)).save(saved.capture());
        RefreshToken replacement = saved.getAllValues().get(0);
        assertThat(replacement.getFamilyId()).isEqualTo("family-1");
    }

    @Test
    void rotate_shouldReject_AlreadyRotatedToken_AndRevokeFamily() {
        String stolenToken = "old-refresh-token";
        String stolenHash = RefreshTokenService.hash(stolenToken);
        // The attacker replays a token that was already replaced (legit rotation happened).
        RefreshToken stolenRecord = record(stolenHash, "family-1", "user-1", false, true);
        RefreshToken sibling = record("sibling-hash", "family-1", "user-1", false, false);

        when(jwtTokenProvider.isRefreshToken(stolenToken)).thenReturn(true);
        when(jwtTokenProvider.getUserIdFromToken(stolenToken)).thenReturn("user-1");
        when(refreshTokenRepository.findByTokenHash(stolenHash)).thenReturn(Optional.of(stolenRecord));
        when(refreshTokenRepository.findByFamilyId("family-1")).thenReturn(List.of(stolenRecord, sibling));

        assertThatThrownBy(() -> refreshTokenService.rotate(stolenToken, null, null))
                .isInstanceOf(AuthException.class)
                .hasMessageContaining("reuse detected");

        // The whole family is dead — including the legitimate replacement.
        assertThat(stolenRecord.isRevoked()).isTrue();
        assertThat(sibling.isRevoked()).isTrue();
        verify(jwtTokenProvider, never()).generateRefreshToken(anyString());
    }

    @Test
    void rotate_shouldReject_RevokedToken() {
        String token = "revoked-token";
        String hash = RefreshTokenService.hash(token);
        RefreshToken revokedRecord = record(hash, "family-1", "user-1", true, false);

        when(jwtTokenProvider.isRefreshToken(token)).thenReturn(true);
        when(jwtTokenProvider.getUserIdFromToken(token)).thenReturn("user-1");
        when(refreshTokenRepository.findByTokenHash(hash)).thenReturn(Optional.of(revokedRecord));

        assertThatThrownBy(() -> refreshTokenService.rotate(token, null, null))
                .isInstanceOf(AuthException.class);
    }

    @Test
    void rotate_shouldReject_UnknownToken() {
        String token = "unknown-token";
        when(jwtTokenProvider.isRefreshToken(token)).thenReturn(true);
        when(jwtTokenProvider.getUserIdFromToken(token)).thenReturn("user-1");
        when(refreshTokenRepository.findByTokenHash(RefreshTokenService.hash(token)))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> refreshTokenService.rotate(token, null, null))
                .isInstanceOf(AuthException.class)
                .hasMessageContaining("Invalid or expired refresh token");
    }

    @Test
    void rotate_shouldReject_ExpiredToken() {
        String token = "expired-token";
        String hash = RefreshTokenService.hash(token);
        RefreshToken expired = record(hash, "family-1", "user-1", false, false);
        expired.setExpiresAt(Instant.now().minusSeconds(60));

        when(jwtTokenProvider.isRefreshToken(token)).thenReturn(true);
        when(jwtTokenProvider.getUserIdFromToken(token)).thenReturn("user-1");
        when(refreshTokenRepository.findByTokenHash(hash)).thenReturn(Optional.of(expired));

        assertThatThrownBy(() -> refreshTokenService.rotate(token, null, null))
                .isInstanceOf(AuthException.class)
                .hasMessageContaining("Invalid or expired refresh token");
    }

    @Test
    void rotate_shouldReject_NonRefreshToken() {
        String accessToken = "access-token";
        when(jwtTokenProvider.isRefreshToken(accessToken)).thenReturn(false);

        assertThatThrownBy(() -> refreshTokenService.rotate(accessToken, null, null))
                .isInstanceOf(AuthException.class);
        verify(refreshTokenRepository, never()).findByTokenHash(anyString());
    }

    @Test
    void rotate_shouldReject_BlockedUser_AndRevokeAllTheirTokens() {
        String token = "token";
        String hash = RefreshTokenService.hash(token);
        RefreshToken record = record(hash, "family-1", "user-1", false, false);
        User blocked = activeUser("user-1");
        blocked.setBlocked(true);

        when(jwtTokenProvider.isRefreshToken(token)).thenReturn(true);
        when(jwtTokenProvider.getUserIdFromToken(token)).thenReturn("user-1");
        when(refreshTokenRepository.findByTokenHash(hash)).thenReturn(Optional.of(record));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(blocked));

        assertThatThrownBy(() -> refreshTokenService.rotate(token, null, null))
                .isInstanceOf(AuthException.class)
                .hasMessageContaining("blocked");

        verify(refreshTokenRepository).revokeAllForUser(eq("user-1"), any(Instant.class));
        verify(jwtTokenProvider, never()).generateRefreshToken(anyString());
    }

    @Test
    void rotate_shouldReject_DeletedUser() {
        String token = "token";
        String hash = RefreshTokenService.hash(token);
        RefreshToken record = record(hash, "family-1", "user-1", false, false);
        User deleted = activeUser("user-1");
        deleted.setDeleted(true);

        when(jwtTokenProvider.isRefreshToken(token)).thenReturn(true);
        when(jwtTokenProvider.getUserIdFromToken(token)).thenReturn("user-1");
        when(refreshTokenRepository.findByTokenHash(hash)).thenReturn(Optional.of(record));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(deleted));

        assertThatThrownBy(() -> refreshTokenService.rotate(token, null, null))
                .isInstanceOf(AuthException.class)
                .hasMessageContaining("deleted");
        verify(refreshTokenRepository).revokeAllForUser(eq("user-1"), any(Instant.class));
    }

    @Test
    void revoke_shouldMarkPresentedTokenRevoked() {
        String token = "logout-token";
        String hash = RefreshTokenService.hash(token);
        RefreshToken record = record(hash, "family-1", "user-1", false, false);
        when(refreshTokenRepository.findByTokenHash(hash)).thenReturn(Optional.of(record));

        refreshTokenService.revoke(token);

        assertThat(record.isRevoked()).isTrue();
    }

    @Test
    void revokeAllForUser_shouldInvalidateEverySession() {
        refreshTokenService.revokeAllForUser("user-1");
        verify(refreshTokenRepository).revokeAllForUser(eq("user-1"), any(Instant.class));
    }

    @Test
    void rotate_shouldNotMatch_UserIdMismatch() {
        String token = "token";
        String hash = RefreshTokenService.hash(token);
        RefreshToken record = record(hash, "family-1", "user-1", false, false);

        when(jwtTokenProvider.isRefreshToken(token)).thenReturn(true);
        when(jwtTokenProvider.getUserIdFromToken(token)).thenReturn("user-2"); // token says user-2
        when(refreshTokenRepository.findByTokenHash(hash)).thenReturn(Optional.of(record));
        when(userRepository.findById("user-2")).thenReturn(Optional.of(activeUser("user-2")));

        assertThatThrownBy(() -> refreshTokenService.rotate(token, null, null))
                .isInstanceOf(AuthException.class)
                .hasMessageContaining("Invalid or expired refresh token");
        verify(jwtTokenProvider, never()).generateRefreshToken(anyString());
    }
}
