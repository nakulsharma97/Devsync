package com.devsync.presence;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;
import java.util.Map;

/**
 * Automatically flips a user's presence when they connect to / disconnect from
 * the WebSocket. Falls back to the X-User-Id connect header when no principal
 * is available (SockJS / pre-auth upgrades).
 */
@Component
@RequiredArgsConstructor
public class PresenceEventListener {

    private static final Logger log = LoggerFactory.getLogger(PresenceEventListener.class);

    private final PresenceService presenceService;
    private final PresenceSessionTracker sessionTracker;

    @EventListener
    public void onConnect(SessionConnectedEvent event) {
        String userId = extractUserId(event.getUser(), event);
        if (userId != null) {
            sessionTracker.connected(userId, sessionId(event));
            presenceService.updateStatus(userId, PresenceStatus.ONLINE.name());
        }
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        String userId = extractUserId(event.getUser(), event);
        if (userId == null) return;
        // Only demote to OFFLINE when the LAST session for this user closes;
        // other tabs/devices may still be connected.
        int remaining = sessionTracker.disconnected(userId, sessionId(event));
        if (remaining == 0) {
            presenceService.updateStatus(userId, PresenceStatus.OFFLINE.name());
        }
    }

    private String sessionId(org.springframework.context.ApplicationEvent event) {
        try {
            if (event instanceof org.springframework.web.socket.messaging.AbstractSubProtocolEvent subEvent) {
                Object sessionId = subEvent.getMessage().getHeaders()
                        .get(SimpMessageHeaderAccessor.SESSION_ID_HEADER);
                return sessionId != null ? String.valueOf(sessionId) : null;
            }
        } catch (Exception e) {
            log.debug("Could not extract session id from WS event: {}", e.getMessage());
        }
        return null;
    }

    private String extractUserId(Principal user, org.springframework.context.ApplicationEvent event) {
        if (user != null && user.getName() != null && !user.getName().isBlank()) {
            return user.getName();
        }
        try {
            if (event instanceof SessionConnectedEvent connected) {
                var headers = connected.getMessage().getHeaders();
                Object nativeHeaders = headers.get("nativeHeaders");
                if (nativeHeaders instanceof Map<?, ?> map) {
                    Object values = map.get("X-User-Id");
                    if (values instanceof java.util.List<?> list && !list.isEmpty()) {
                        return String.valueOf(list.get(0));
                    }
                }
            }
        } catch (Exception e) {
            log.debug("Could not extract user id from WS event: {}", e.getMessage());
        }
        return null;
    }
}
