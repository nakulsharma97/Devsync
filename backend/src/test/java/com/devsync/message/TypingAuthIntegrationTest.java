package com.devsync.message;

import com.devsync.auth.JwtTokenProvider;
import com.devsync.teamroom.entity.TeamRoom;
import com.devsync.teamroom.entity.TeamRoomParticipant;
import com.devsync.teamroom.repository.TeamRoomParticipantRepository;
import com.devsync.teamroom.repository.TeamRoomRepository;
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
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * WebSocket typing-event authorization: /app/chat.typing must only broadcast
 * into a room the sender is a participant of (with an active project), and DM
 * typing indicators must only reach the intended participant's private queue.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class TypingAuthIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired private JwtTokenProvider jwtTokenProvider;
    @Autowired private UserRepository userRepository;
    @Autowired private TeamRoomRepository roomRepository;
    @Autowired private TeamRoomParticipantRepository participantRepository;

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
        participantRepository.deleteAll();
        roomRepository.deleteAll();
    }

    // ── Helpers ────────────────────────────────────────────────────────

    private User createUser(String email) {
        return userRepository.save(User.builder()
                .email(email)
                .username(email.split("@")[0])
                .fullName("Typing " + email)
                .password("{noop}irrelevant")
                .emailVerified(true)
                .build());
    }

    /** Creates a room (no project) and returns its id. */
    private String createRoom(String name, String createdBy, String... participantIds) {
        TeamRoom room = roomRepository.save(TeamRoom.builder()
                .name(name).createdBy(createdBy).build());
        for (String participantId : participantIds) {
            participantRepository.save(TeamRoomParticipant.builder()
                    .roomId(room.getId()).userId(participantId).build());
        }
        return room.getId();
    }

    private StompSession connect(User user) throws Exception {
        StompHeaders headers = new StompHeaders();
        headers.add("Authorization", "Bearer "
                + jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail()));
        WebSocketStompClient client = new WebSocketStompClient(new StandardWebSocketClient());
        client.setMessageConverter(new MappingJackson2MessageConverter());
        StompSession session = client.connectAsync("ws://localhost:" + port + "/ws",
                (org.springframework.web.socket.WebSocketHttpHeaders) null, headers,
                new StompSessionHandlerAdapter() {}).get(5, TimeUnit.SECONDS);
        sessions.add(session);
        return session;
    }

    /** Subscribes to a room's typing topic; captures the next received indicator. */
    private AtomicReference<WebSocketController.TypingIndicator> subscribeToRoomTyping(
            StompSession session, String roomId) {
        AtomicReference<WebSocketController.TypingIndicator> received = new AtomicReference<>();
        session.subscribe("/topic/room/" + roomId + "/typing", new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return WebSocketController.TypingIndicator.class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                received.set((WebSocketController.TypingIndicator) payload);
            }
        });
        return received;
    }

    /** Subscribes to the caller's own DM typing queue. */
    private AtomicReference<WebSocketController.TypingIndicator> subscribeToDmTyping(StompSession session) {
        AtomicReference<WebSocketController.TypingIndicator> received = new AtomicReference<>();
        session.subscribe("/user/queue/typing", new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return WebSocketController.TypingIndicator.class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                received.set((WebSocketController.TypingIndicator) payload);
            }
        });
        return received;
    }

    // ── 1. Authorized member typing ────────────────────────────────────

    @Test
    void authorizedMemberTyping_isBroadcastToRoomTopic() throws Exception {
        User alice = createUser("typing-alice@test.dev");
        User bob = createUser("typing-bob@test.dev");
        String roomId = createRoom("Squad", alice.getId(), alice.getId(), bob.getId());

        StompSession aliceSession = connect(alice);
        StompSession bobSession = connect(bob);
        AtomicReference<WebSocketController.TypingIndicator> bobSees =
                subscribeToRoomTyping(bobSession, roomId);
        Thread.sleep(500); // let subscriptions land

        aliceSession.send("/app/chat.typing", Map.of(
                "roomId", roomId,
                "typing", true));

        long deadline = System.currentTimeMillis() + 5000;
        while (bobSees.get() == null && System.currentTimeMillis() < deadline) {
            Thread.sleep(50);
        }
        assertThat(bobSees.get()).isNotNull();
        assertThat(bobSees.get().getUserId()).isEqualTo(alice.getId());
        assertThat(bobSees.get().getRoomId()).isEqualTo(roomId);
        assertThat(bobSees.get().isTyping()).isTrue();
    }

    // ── 2. Non-member typing ───────────────────────────────────────────

    @Test
    void nonMemberTyping_isNotBroadcast() throws Exception {
        User alice = createUser("typing-nm-alice@test.dev");
        User bob = createUser("typing-nm-bob@test.dev");
        User carol = createUser("typing-nm-carol@test.dev");
        String roomId = createRoom("Squad", alice.getId(), alice.getId(), bob.getId());

        StompSession bobSession = connect(bob);
        StompSession carolSession = connect(carol);
        AtomicReference<WebSocketController.TypingIndicator> bobSees =
                subscribeToRoomTyping(bobSession, roomId);
        Thread.sleep(500);

        // Carol is NOT a participant — her typing must be rejected, not broadcast.
        carolSession.send("/app/chat.typing", Map.of(
                "roomId", roomId,
                "typing", true));

        Thread.sleep(2500);
        assertThat(bobSees.get())
                .as("typing from a non-participant must never reach the room")
                .isNull();
        // The rejection must not kill Carol's session.
        assertThat(carolSession.isConnected()).isTrue();
    }

    // ── 3. Invalid room ────────────────────────────────────────────────

    @Test
    void invalidRoom_typing_isNotBroadcast() throws Exception {
        User alice = createUser("typing-inv-alice@test.dev");
        User bob = createUser("typing-inv-bob@test.dev");
        String roomId = createRoom("Squad", alice.getId(), alice.getId(), bob.getId());

        StompSession aliceSession = connect(alice);
        StompSession bobSession = connect(bob);
        AtomicReference<WebSocketController.TypingIndicator> bobSees =
                subscribeToRoomTyping(bobSession, roomId);
        Thread.sleep(500);

        // Room does not exist — must be rejected even for a real participant.
        aliceSession.send("/app/chat.typing", Map.of(
                "roomId", "room-does-not-exist",
                "typing", true));

        Thread.sleep(2500);
        assertThat(bobSees.get())
                .as("typing for an unknown room must not be broadcast")
                .isNull();
        assertThat(aliceSession.isConnected()).isTrue();
    }

    // ── 4. Unauthenticated connection ──────────────────────────────────

    @Test
    void unauthenticatedConnection_isRejected() {
        try {
            StompHeaders headers = new StompHeaders(); // no Authorization header
            WebSocketStompClient client = new WebSocketStompClient(new StandardWebSocketClient());
            client.setMessageConverter(new MappingJackson2MessageConverter());
            StompSession session = client.connectAsync("ws://localhost:" + port + "/ws",
                    (org.springframework.web.socket.WebSocketHttpHeaders) null, headers,
                    new StompSessionHandlerAdapter() {}).get(5, TimeUnit.SECONDS);
            assertThat(session == null || !session.isConnected())
                    .as("STOMP connection without a token must be rejected")
                    .isTrue();
        } catch (Exception e) {
            // connect future completed exceptionally -> rejected
            assertThat(true).isTrue();
        }
    }

    // ── 5. DM participant typing ───────────────────────────────────────

    @Test
    void dmParticipantTyping_goesOnlyToReceiverQueue() throws Exception {
        User alice = createUser("typing-dm-alice@test.dev");
        User bob = createUser("typing-dm-bob@test.dev");
        User carol = createUser("typing-dm-carol@test.dev");

        StompSession aliceSession = connect(alice);
        StompSession bobSession = connect(bob);
        StompSession carolSession = connect(carol);
        AtomicReference<WebSocketController.TypingIndicator> bobSees = subscribeToDmTyping(bobSession);
        AtomicReference<WebSocketController.TypingIndicator> carolSees = subscribeToDmTyping(carolSession);
        Thread.sleep(500);

        aliceSession.send("/app/chat.typing", Map.of(
                "receiverId", bob.getId(),
                "typing", true));

        long deadline = System.currentTimeMillis() + 5000;
        while (bobSees.get() == null && System.currentTimeMillis() < deadline) {
            Thread.sleep(50);
        }
        assertThat(bobSees.get()).isNotNull();
        assertThat(bobSees.get().getUserId()).isEqualTo(alice.getId());
        assertThat(bobSees.get().getReceiverId()).isEqualTo(bob.getId());

        Thread.sleep(1500);
        assertThat(carolSees.get())
                .as("a DM typing indicator must never reach a third party")
                .isNull();
    }
}
