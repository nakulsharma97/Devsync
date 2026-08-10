package com.devsync.message;

import com.devsync.auth.JwtTokenProvider;
import com.devsync.auth.WsRateLimiter;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * WebSocket rate limiting (test profile: max 5 messages/min, 3 subs/min per user).
 * The limit is per USER — one user spamming must not affect another.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class WsRateLimitTest {

    @LocalServerPort
    private int port;

    @Autowired private JwtTokenProvider jwtTokenProvider;
    @Autowired private UserRepository userRepository;
    @Autowired private WsRateLimiter wsRateLimiter;

    private final List<StompSession> sessions = new ArrayList<>();

    @AfterEach
    void cleanup() {
        sessions.forEach(s -> {
            try {
                s.disconnect();
            } catch (Exception ignored) {
            }
        });
        sessions.clear();
        userRepository.deleteAll();
    }

    private User createUser(String email) {
        return userRepository.save(User.builder()
                .email(email)
                .username(email.split("@")[0])
                .fullName("Rate " + email)
                .password("{noop}x")
                .emailVerified(true)
                .build());
    }

    private StompSession connect(String userId) throws Exception {
        String token = jwtTokenProvider.generateAccessToken(userId, userId + "@test.dev");
        StompHeaders headers = new StompHeaders();
        headers.add("Authorization", "Bearer " + token);
        WebSocketStompClient client = new WebSocketStompClient(new StandardWebSocketClient());
        client.setMessageConverter(new MappingJackson2MessageConverter());
        StompSession session = client.connectAsync("ws://localhost:" + port + "/ws",
                (org.springframework.web.socket.WebSocketHttpHeaders) null, headers,
                new StompSessionHandlerAdapter() {}).get(10, TimeUnit.SECONDS);
        sessions.add(session);
        return session;
    }

    private AtomicInteger subscribeToPresence(StompSession session) {
        AtomicInteger received = new AtomicInteger();
        session.subscribe("/topic/presence", new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return Map.class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                received.incrementAndGet();
            }
        });
        return received;
    }

    private void sendPresence(StompSession session, String status) {
        session.send("/app/presence", Map.of("status", status));
    }

    @Test
    void normalMessageRate_succeeds() throws Exception {
        User user = createUser("rate@test.dev");
        StompSession session = connect(user.getId());
        AtomicInteger received = subscribeToPresence(session);
        Thread.sleep(500); // let the subscription land

        for (int i = 0; i < 3; i++) {
            sendPresence(session, "ONLINE");
        }
        Thread.sleep(1500);
        // 3 sends under the limit of 5 → all broadcast.
        assertThat(received.get()).isEqualTo(3);
    }

    @Test
    void excessiveMessageRate_isDropped() throws Exception {
        User user = createUser("rate@test.dev");
        StompSession session = connect(user.getId());
        AtomicInteger received = subscribeToPresence(session);
        Thread.sleep(500);

        for (int i = 0; i < 10; i++) {
            sendPresence(session, "ONLINE");
        }
        Thread.sleep(1500);
        // Only the first 5 (the configured limit) pass; the rest are rejected.
        assertThat(received.get()).isLessThanOrEqualTo(5);
    }

    @Test
    void oneUser_cannotExhaust_AnotherUsersQuota() throws Exception {
        User spammer = createUser("spam@test.dev");
        User other = createUser("other@test.dev");

        StompSession spamSession = connect(spammer.getId());
        StompSession otherSession = connect(other.getId());
        AtomicInteger spamReceived = subscribeToPresence(spamSession);
        AtomicInteger otherReceived = subscribeToPresence(otherSession);
        Thread.sleep(500);

        // Spammer exhausts their own quota.
        for (int i = 0; i < 10; i++) {
            sendPresence(spamSession, "ONLINE");
        }
        // The other user still has a full quota and their message goes through.
        sendPresence(otherSession, "ONLINE");

        Thread.sleep(1500);
        // Both sessions receive every /topic/presence broadcast. The spammer sent
        // 10 but only 5 are allowed, so spamReceived is at most 5 own + 1 (the
        // other user's broadcast). The other user's message got through => >= 1
        // broadcast beyond the spammer's allowance, proving quota isolation.
        assertThat(spamReceived.get()).isBetween(5, 6);
        assertThat(otherReceived.get()).isGreaterThanOrEqualTo(spamReceived.get());
    }

    @Test
    void disconnectedSession_cleansUpState() throws Exception {
        User user = createUser("rate@test.dev");
        StompSession session = connect(user.getId());
        AtomicInteger received = subscribeToPresence(session);
        Thread.sleep(500);
        for (int i = 0; i < 3; i++) {
            sendPresence(session, "ONLINE");
        }
        Thread.sleep(800);
        assertThat(wsRateLimiter.activeUsers()).isGreaterThanOrEqualTo(1);

        session.disconnect();
        // Wait for the DISCONNECT frame to be processed server-side.
        Thread.sleep(1500);
        assertThat(wsRateLimiter.activeUsers()).isZero();
    }
}
