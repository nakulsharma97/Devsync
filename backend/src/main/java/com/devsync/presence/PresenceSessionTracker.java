package com.devsync.presence;

import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Tracks active WebSocket sessions per user. A user may hold several sessions
 * (multiple tabs/devices); presence should only be demoted to OFFLINE when the
 * last session disconnects, so one tab closing never flips a connected user offline.
 */
@Component
public class PresenceSessionTracker {

    private final ConcurrentHashMap<String, Set<String>> sessionsByUser = new ConcurrentHashMap<>();

    /**
     * Registers a session. Returns the number of active sessions for the user
     * after registration.
     */
    public int connected(String userId, String sessionId) {
        if (userId == null || userId.isBlank()) return 0;
        Set<String> sessions = sessionsByUser.computeIfAbsent(
                userId, k -> ConcurrentHashMap.newKeySet());
        sessions.add(sessionId);
        return sessions.size();
    }

    /**
     * Unregisters a session. Returns the number of remaining sessions for the
     * user (0 means the user has no open WebSocket sessions).
     */
    public int disconnected(String userId, String sessionId) {
        if (userId == null || userId.isBlank()) return 0;
        Set<String> sessions = sessionsByUser.get(userId);
        if (sessions == null) return 0;
        sessions.remove(sessionId);
        if (sessions.isEmpty()) {
            sessionsByUser.remove(userId);
            return 0;
        }
        return sessions.size();
    }

    /** Returns the number of active sessions for a user (0 if none). */
    public int activeSessions(String userId) {
        if (userId == null || userId.isBlank()) return 0;
        Set<String> sessions = sessionsByUser.get(userId);
        return sessions == null ? 0 : sessions.size();
    }

    /** Clears all tracking (used in tests and on application shutdown). */
    public void clear() {
        sessionsByUser.clear();
    }
}
