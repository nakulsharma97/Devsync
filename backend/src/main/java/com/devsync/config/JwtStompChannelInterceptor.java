package com.devsync.config;

import com.devsync.auth.JwtTokenProvider;
import com.devsync.auth.WsRateLimiter;
import com.devsync.presence.PresenceService;
import com.devsync.teamroom.repository.TeamRoomParticipantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Authenticates STOMP connections with the same access JWT used by the REST API
 * and enforces subscription-level authorization on the WebSocket broker.
 *
 * <ul>
 *   <li><b>CONNECT</b> — validates the {@code Authorization: Bearer <access token>}
 *       header from the CONNECT frame (refresh tokens and blocked/deleted accounts
 *       are rejected, mirroring {@code JwtAuthenticationFilter}) and binds the
 *       authenticated principal to the STOMP session. Rejects the connection when
 *       the token is missing or invalid.</li>
 *   <li><b>SUBSCRIBE</b> — blocks subscribing to another user's private queue
 *       ({@code /user/{otherId}/queue/...}) and to project-room topics
 *       ({@code /topic/room/{roomId}[\/typing]}) without room membership.</li>
 *   <li><b>DISCONNECT</b> — marks the user OFFLINE so presence reflects reality
 *       when a client goes away without sending an explicit status update.</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
public class JwtStompChannelInterceptor implements ChannelInterceptor {

    /** A fully-qualified user queue: /user/{userId}/queue/... */
    private static final Pattern USER_QUEUE = Pattern.compile("^/user/([^/]+)/queue/.+");
    /** Project room topic (plain or typing variant): /topic/room/{roomId}[/typing] */
    private static final Pattern ROOM_TOPIC = Pattern.compile("^/topic/room/([^/]+)(/typing)?$");

    private final JwtTokenProvider jwtTokenProvider;
    private final UserDetailsService userDetailsService;
    private final TeamRoomParticipantRepository participantRepository;
    private final PresenceService presenceService;
    private final WsRateLimiter wsRateLimiter;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            accessor = StompHeaderAccessor.wrap(message);
        }
        StompCommand command = accessor.getCommand();
        if (command == null) {
            return message;
        }

        switch (command) {
            case CONNECT -> {
                Authentication auth = authenticate(accessor);
                if (auth == null) {
                    return null; // reject CONNECT: missing/invalid credentials
                }
                accessor.setUser(auth);
                return message;
            }
            case SUBSCRIBE -> {
                Authentication auth = (Authentication) accessor.getUser();
                if (auth == null || !authorizeSubscribe(accessor.getDestination(), auth.getName())) {
                    return null; // reject SUBSCRIBE: unauthorized destination
                }
                // Rate-limit subscription abuse (subscribe churn, spy sweeps).
                if (!wsRateLimiter.allowSubscription(auth.getName())) {
                    return null;
                }
                return message;
            }
            case SEND -> {
                // Rate-limit chat/typing/presence publishing. Other /app destinations
                // are not rate limited (there are none today).
                String destination = accessor.getDestination();
                if (destination != null && (destination.startsWith("/app/chat.")
                        || destination.startsWith("/app/presence"))) {
                    Authentication auth = (Authentication) accessor.getUser();
                    if (auth == null || !wsRateLimiter.allowMessage(auth.getName())) {
                        return null; // reject SEND: rate limit exceeded
                    }
                }
                return message;
            }
            case DISCONNECT -> {
                Authentication auth = (Authentication) accessor.getUser();
                if (auth != null) {
                    // Drop rate-limit state so disconnected users never consume memory.
                    wsRateLimiter.clear(auth.getName());
                    try {
                        presenceService.updateStatus(auth.getName(), "OFFLINE");
                    } catch (Exception ignored) {
                        // Presence bookkeeping must never break the disconnect handshake.
                    }
                }
                return message;
            }
            default -> {
                return message;
            }
        }
    }

    private boolean authorizeSubscribe(String destination, String userId) {
        if (destination == null) {
            return true;
        }
        if (destination.startsWith("/user/")) {
            // /user/queue/... is resolved to the caller's own queue by the broker;
            // /user/{id}/queue/... is only legal when {id} is the caller themselves.
            if (destination.startsWith("/user/queue/")) {
                return true;
            }
            Matcher m = USER_QUEUE.matcher(destination);
            return m.matches() && m.group(1).equals(userId);
        }
        if (destination.startsWith("/topic/room/")) {
            Matcher m = ROOM_TOPIC.matcher(destination);
            return m.matches() && participantRepository.existsByRoomIdAndUserId(m.group(1), userId);
        }
        // /topic/presence and any other topic: any authenticated user.
        return true;
    }

    private Authentication authenticate(StompHeaderAccessor accessor) {
        String bearer = accessor.getFirstNativeHeader("Authorization");
        if (!StringUtils.hasText(bearer) || !bearer.startsWith("Bearer ")) {
            return null;
        }
        String token = bearer.substring(7);
        if (!StringUtils.hasText(token) || !jwtTokenProvider.isAccessToken(token)) {
            return null;
        }
        try {
            String userId = jwtTokenProvider.getUserIdFromToken(token);
            // Throws for missing, blocked or deleted users — same policy as REST.
            UserDetails userDetails = userDetailsService.loadUserByUsername(userId);
            return new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
        } catch (Exception e) {
            return null;
        }
    }
}
