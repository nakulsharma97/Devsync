package com.devsync.message;

import com.devsync.auth.JwtTokenProvider;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * WebSocket security: STOMP CONNECT must require a valid access JWT (refresh
 * tokens, blocked accounts and anonymous clients rejected) and subscriptions
 * must be limited to the caller's own queues.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class WebSocketAuthTest {

    @LocalServerPort
    private int port;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private UserRepository userRepository;

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

    // ── Helpers ────────────────────────────────────────────────────────

    private User createUser(String email) {
        User user = User.builder()
                .email(email)
                .username(email.split("@")[0])
                .fullName("Test " + email)
                .password("{noop}irrelevant")
                .emailVerified(true)
                .build();
        return userRepository.save(user);
    }

    private WebSocketStompClient newClient() {
        WebSocketStompClient client = new WebSocketStompClient(new StandardWebSocketClient());
        client.setMessageConverter(new MappingJackson2MessageConverter());
        return client;
    }

    private StompSession connect(String bearerToken) throws Exception {
        StompHeaders headers = new StompHeaders();
        if (bearerToken != null) {
            headers.add("Authorization", "Bearer " + bearerToken);
        }
        return connect(headers, new StompSessionHandlerAdapter() {
        });
    }

    private StompSession connect(StompHeaders headers, StompSessionHandlerAdapter handler) throws Exception {
        StompSession session = newClient()
                .connectAsync("ws://localhost:" + port + "/ws", (org.springframework.web.socket.WebSocketHttpHeaders) null, headers, handler)
                .get(5, TimeUnit.SECONDS);
        sessions.add(session);
        return session;
    }

    private boolean connectRejected(String bearerToken) {
        try {
            StompSession session = connect(bearerToken);
            return session == null || !session.isConnected();
        } catch (Exception e) {
            return true; // connect future completed exceptionally -> rejected
        }
    }

    // ── CONNECT authentication ────────────────────────────────────────

    @Test
    void connect_withoutToken_isRejected() {
        assertThat(connectRejected(null))
                .as("anonymous STOMP connection must be rejected")
                .isTrue();
    }

    @Test
    void connect_withGarbageToken_isRejected() {
        assertThat(connectRejected("not.a.jwt"))
                .as("STOMP connection with invalid token must be rejected")
                .isTrue();
    }

    @Test
    void connect_withRefreshToken_isRejected() {
        User user = createUser("refresh@test.dev");
        String refresh = jwtTokenProvider.generateRefreshToken(user.getId());
        assertThat(connectRejected(refresh))
                .as("refresh tokens must never authenticate WebSocket connections")
                .isTrue();
    }

    @Test
    void connect_withBlockedUserToken_isRejected() {
        User user = createUser("blocked@test.dev");
        user.setBlocked(true);
        userRepository.save(user);
        String token = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail());
        assertThat(connectRejected(token))
                .as("blocked user must not be able to open a WebSocket session")
                .isTrue();
    }

    @Test
    void connect_withValidToken_succeedsAndPresenceBroadcasts() throws Exception {
        User user = createUser("live@test.dev");
        String token = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail());

        CountDownLatch presenceLatch = new CountDownLatch(1);
        AtomicBoolean presenceReceived = new AtomicBoolean(false);

        StompSession session = connect(token);
        assertThat(session.isConnected()).isTrue();

        session.subscribe("/topic/presence", new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return Map.class;
            }

            @Override
            @SuppressWarnings("unchecked")
            public void handleFrame(StompHeaders headers, Object payload) {
                Map<String, Object> body = (Map<String, Object>) payload;
                if (user.getId().equals(body.get("userId"))) {
                    presenceReceived.set(true);
                    presenceLatch.countDown();
                }
            }
        });

        session.send("/app/presence", Map.of("status", "ONLINE"));
        assertThat(presenceLatch.await(5, TimeUnit.SECONDS))
                .as("authenticated presence update must be broadcast")
                .isTrue();
        assertThat(presenceReceived.get()).isTrue();

        // Presence was persisted for the authenticated user.
        assertThat(userRepository.findById(user.getId()).orElseThrow().getPresenceStatus().name())
                .isEqualTo("ONLINE");
    }

    // ── Subscription authorization ────────────────────────────────────

    @Test
    void cannotSubscribeToAnotherUsersQueue() throws Exception {
        User alice = createUser("alice@test.dev");
        User bob = createUser("bob@test.dev");

        StompSession aliceSession = connect(jwtTokenProvider.generateAccessToken(alice.getId(), alice.getEmail()));
        StompSession bobSession = connect(jwtTokenProvider.generateAccessToken(bob.getId(), bob.getEmail()));

        // Bob tries to eavesdrop on Alice's private queue.
        AtomicBoolean bobReceived = new AtomicBoolean(false);
        bobSession.subscribe("/user/" + alice.getId() + "/queue/messages", new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return Map.class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                bobReceived.set(true);
            }
        });

        // Alice sends a DM to Bob — a copy also lands on Alice's own queue.
        aliceSession.send("/app/chat.send", Map.of(
                "receiverId", bob.getId(),
                "content", "secret between alice and bob",
                "messageType", "text"));

        // Bob must NOT receive Alice's message on Alice's queue.
        Thread.sleep(2500);
        assertThat(bobReceived.get())
                .as("subscription to another user's queue must be rejected")
                .isFalse();
    }
}
