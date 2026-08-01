package com.devsync.presence;

import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PresenceServiceTest {

    @Mock private UserRepository userRepository;

    private PresenceService presenceService;

    @BeforeEach
    void setUp() {
        presenceService = new PresenceService(userRepository);
    }

    @Test
    void updateStatus_shouldPersistStatusAndActivity() {
        User user = new User();
        user.setId("u1");
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));

        presenceService.updateStatus("u1", "AWAY");

        assertThat(user.getPresenceStatus()).isEqualTo(PresenceStatus.AWAY);
        assertThat(user.getLastActiveAt()).isNotNull();
        verify(userRepository).save(user);
    }

    @Test
    void updateStatus_shouldRejectInvalidStatus() {
        User user = new User();
        user.setId("u1");
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> presenceService.updateStatus("u1", "ASLEEP"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid presence status");
        verify(userRepository, never()).save(any());
    }

    @Test
    void effectiveStatus_shouldBeOffline_WhenNoActivity() {
        assertThat(presenceService.effectiveStatus(new User())).isEqualTo("OFFLINE");
        assertThat(presenceService.effectiveStatus(null)).isEqualTo("OFFLINE");
    }

    @Test
    void effectiveStatus_shouldBeOnline_WhenFresh() {
        User user = new User();
        user.setPresenceStatus(PresenceStatus.ONLINE);
        user.setLastActiveAt(Instant.now());
        assertThat(presenceService.effectiveStatus(user)).isEqualTo("ONLINE");
    }

    @Test
    void effectiveStatus_shouldDemoteToAway_WhenStale() {
        User user = new User();
        user.setPresenceStatus(PresenceStatus.ONLINE);
        user.setLastActiveAt(Instant.now().minus(Duration.ofMinutes(5)));
        assertThat(presenceService.effectiveStatus(user)).isEqualTo("AWAY");
    }

    @Test
    void effectiveStatus_shouldDemoteToOffline_WhenVeryStale() {
        User user = new User();
        user.setPresenceStatus(PresenceStatus.ONLINE);
        user.setLastActiveAt(Instant.now().minus(Duration.ofMinutes(15)));
        assertThat(presenceService.effectiveStatus(user)).isEqualTo("OFFLINE");
    }
}
