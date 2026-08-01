package com.devsync.presence;

import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class PresenceService {

    /** Heartbeats older than this are demoted from ONLINE to AWAY. */
    private static final Duration ONLINE_WINDOW = Duration.ofMinutes(3);
    /** Heartbeats older than this are considered OFFLINE. */
    private static final Duration OFFLINE_WINDOW = Duration.ofMinutes(10);

    private final UserRepository userRepository;

    @Transactional
    public void updateStatus(String userId, String status) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;
        PresenceStatus parsed = parse(status);
        user.setPresenceStatus(parsed);
        user.setLastActiveAt(Instant.now());
        userRepository.save(user);
    }

    @Transactional
    public void touch(String userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;
        user.setLastActiveAt(Instant.now());
        userRepository.save(user);
    }

    /**
     * Computes the effective presence, automatically demoting stale heartbeats
     * so no scheduled job is required: ONLINE -> AWAY after 3 min, -> OFFLINE after 10 min.
     */
    public String effectiveStatus(User user) {
        if (user == null || user.getLastActiveAt() == null) return PresenceStatus.OFFLINE.name();
        long ageMinutes = Duration.between(user.getLastActiveAt(), Instant.now()).toMinutes();
        if (ageMinutes >= OFFLINE_WINDOW.toMinutes()) return PresenceStatus.OFFLINE.name();
        if (ageMinutes >= ONLINE_WINDOW.toMinutes()) return PresenceStatus.AWAY.name();
        PresenceStatus status = user.getPresenceStatus();
        return status != null ? status.name() : PresenceStatus.ONLINE.name();
    }

    private PresenceStatus parse(String status) {
        if (status == null || status.isBlank()) return PresenceStatus.ONLINE;
        try {
            return PresenceStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid presence status: " + status);
        }
    }
}
