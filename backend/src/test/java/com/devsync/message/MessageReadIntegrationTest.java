package com.devsync.message;

import com.devsync.auth.JwtTokenProvider;
import com.devsync.message.entity.Message;
import com.devsync.message.entity.MessageStatus;
import com.devsync.message.repository.MessageRepository;
import com.devsync.project.ProjectService;
import com.devsync.project.dto.CreateProjectRequest;
import com.devsync.teamroom.TeamRoomService;
import com.devsync.teamroom.dto.CreateRoomRequest;
import com.devsync.teamroom.entity.TeamRoomParticipant;
import com.devsync.teamroom.repository.TeamRoomParticipantRepository;
import com.devsync.teamroom.repository.TeamRoomRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Messaging audit: per-message status (SENT/DELIVERED/READ), unread counts,
 * mark-read on conversation open, and authorization — DMs are private to the
 * two participants and project rooms are private to project members.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MessageReadIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private MessageRepository messageRepository;
    @Autowired private TeamRoomRepository roomRepository;
    @Autowired private TeamRoomParticipantRepository participantRepository;
    @Autowired private ProjectService projectService;
    @Autowired private TeamRoomService teamRoomService;
    @Autowired private JwtTokenProvider jwtTokenProvider;

    private String aliceId;
    private String bobId;
    private String carolId;
    private String projectId;
    private String roomId;

    @BeforeEach
    void seed() {
        userRepository.deleteAll();
        messageRepository.deleteAll();
        participantRepository.deleteAll();
        roomRepository.deleteAll();

        aliceId = createUser("alice@test.dev", "Alice").getId();
        bobId = createUser("bob@test.dev", "Bob").getId();
        carolId = createUser("carol@test.dev", "Carol").getId();

        CreateProjectRequest req = new CreateProjectRequest();
        req.setName("Msg Squad");
        req.setVisibility("PRIVATE");
        projectId = projectService.createProject(req, aliceId).getId();

        CreateRoomRequest roomReq = new CreateRoomRequest();
        roomReq.setName("Squad Chat");
        roomReq.setProjectId(projectId);
        roomId = teamRoomService.createRoom(roomReq, aliceId).getId();
        participantRepository.save(TeamRoomParticipant.builder()
                .roomId(roomId).userId(bobId).build());
    }

    private User createUser(String email, String name) {
        return userRepository.save(User.builder()
                .email(email)
                .username(email.split("@")[0])
                .fullName(name)
                .password("$2a$10$abcdefghijklmnopqrstuv")
                .emailVerified(true)
                .lastLoginAt(java.time.Instant.now())
                .build());
    }

    private String bearer(String userId) {
        return "Bearer " + jwtTokenProvider.generateAccessToken(userId, userId + "@test.dev");
    }

    private void sendDm(String senderId, String receiverId, String content) throws Exception {
        mockMvc.perform(post("/api/messages")
                        .header("Authorization", bearer(senderId))
                        .contentType(APPLICATION_JSON)
                        .content("{\"receiverId\":\"" + receiverId + "\",\"content\":\"" + content + "\"}"))
                .andExpect(status().isOk());
    }

    private void sendRoomMessage(String senderId, String content) throws Exception {
        mockMvc.perform(post("/api/messages")
                        .header("Authorization", bearer(senderId))
                        .contentType(APPLICATION_JSON)
                        .content("{\"roomId\":\"" + roomId + "\",\"content\":\"" + content + "\"}"))
                .andExpect(status().isOk());
    }

    // ── Direct messages ─────────────────────────────────────

    @Test
    void dm_statusLifecycle_andUnreadCounts() throws Exception {
        sendDm(bobId, aliceId, "Hey Alice");

        // Bob's outbound message is SENT (delivery over WS would flip to DELIVERED)
        Message sent = messageRepository.findAll().stream()
                .filter(m -> m.getReceiverId() != null).findFirst().orElseThrow();
        assertThat(sent.getStatus()).isEqualTo(MessageStatus.SENT);

        // Alice sees exactly 1 unread DM from Bob
        mockMvc.perform(get("/api/messages/conversations").header("Authorization", bearer(aliceId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.type == 'direct' && @.otherUserId == '" + bobId + "')].unreadCount")
                        .value(org.hamcrest.Matchers.hasItem(1)));

        // Opening the conversation marks it read
        mockMvc.perform(post("/api/messages/dm/" + bobId + "/read").header("Authorization", bearer(aliceId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(0));

        // Badge is now 0 and the message itself is READ
        mockMvc.perform(get("/api/messages/conversations").header("Authorization", bearer(aliceId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.type == 'direct' && @.otherUserId == '" + bobId + "')].unreadCount")
                        .value(org.hamcrest.Matchers.hasItem(0)));
        mockMvc.perform(get("/api/messages/dm/" + bobId).header("Authorization", bearer(aliceId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("READ"));
    }

    @Test
    void dm_markRead_onlyAffectsInboundMessages() throws Exception {
        sendDm(bobId, aliceId, "From Bob");
        sendDm(aliceId, bobId, "From Alice");

        // Alice opens the conversation: only Bob's message becomes READ
        mockMvc.perform(post("/api/messages/dm/" + bobId + "/read").header("Authorization", bearer(aliceId)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/messages/dm/" + bobId).header("Authorization", bearer(aliceId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].content").value("From Bob"))
                .andExpect(jsonPath("$[0].status").value("READ"))
                .andExpect(jsonPath("$[1].content").value("From Alice"))
                .andExpect(jsonPath("$[1].status").value("SENT"));
    }

    @Test
    void dm_isPrivate_toParticipants() throws Exception {
        sendDm(bobId, aliceId, "Secret");

        // Carol can neither read the conversation nor mark it read
        mockMvc.perform(get("/api/messages/dm/" + aliceId).header("Authorization", bearer(carolId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
        mockMvc.perform(post("/api/messages/dm/" + aliceId + "/read").header("Authorization", bearer(carolId)))
                .andExpect(status().isOk());
    }

    @Test
    void dm_rejectsUnknownDeletedAndBlockedRecipients() throws Exception {
        mockMvc.perform(post("/api/messages")
                        .header("Authorization", bearer(aliceId))
                        .contentType(APPLICATION_JSON)
                        .content("{\"receiverId\":\"ghost\",\"content\":\"Hi\"}"))
                .andExpect(status().isBadRequest());

        User deleted = userRepository.findById(carolId).orElseThrow();
        deleted.setDeleted(true);
        userRepository.save(deleted);
        mockMvc.perform(post("/api/messages")
                        .header("Authorization", bearer(aliceId))
                        .contentType(APPLICATION_JSON)
                        .content("{\"receiverId\":\"" + carolId + "\",\"content\":\"Hi\"}"))
                .andExpect(status().isBadRequest());

        User blocked = userRepository.findById(carolId).orElseThrow();
        blocked.setDeleted(false);
        blocked.setBlocked(true);
        userRepository.save(blocked);
        mockMvc.perform(post("/api/messages")
                        .header("Authorization", bearer(aliceId))
                        .contentType(APPLICATION_JSON)
                        .content("{\"receiverId\":\"" + carolId + "\",\"content\":\"Hi\"}"))
                .andExpect(status().isBadRequest());
    }

    // ── Project room messages ───────────────────────────────

    @Test
    void room_unreadCounts_andMarkRead() throws Exception {
        sendRoomMessage(aliceId, "Welcome to the squad");

        // Bob has 1 unread room message; Alice's own message isn't counted for her
        mockMvc.perform(get("/api/messages/conversations").header("Authorization", bearer(bobId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.type == 'room' && @.roomId == '" + roomId + "')].unreadCount")
                        .value(org.hamcrest.Matchers.hasItem(1)));
        mockMvc.perform(get("/api/messages/conversations").header("Authorization", bearer(aliceId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.type == 'room' && @.roomId == '" + roomId + "')].unreadCount")
                        .value(org.hamcrest.Matchers.hasItem(0)));

        // Bob opens the room → read
        mockMvc.perform(post("/api/messages/room/" + roomId + "/read").header("Authorization", bearer(bobId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(0));
    }

    @Test
    void room_isPrivate_toProjectMembers() throws Exception {
        sendRoomMessage(aliceId, "Hello team");

        // Carol is not a participant → cannot read, send, or mark read
        mockMvc.perform(get("/api/messages/room/" + roomId).header("Authorization", bearer(carolId)))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/messages/room/" + roomId + "/read").header("Authorization", bearer(carolId)))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/messages")
                        .header("Authorization", bearer(carolId))
                        .contentType(APPLICATION_JSON)
                        .content("{\"roomId\":\"" + roomId + "\",\"content\":\"Intrusion\"}"))
                .andExpect(status().isBadRequest());

        // Unauthenticated requests are rejected outright
        mockMvc.perform(get("/api/messages/room/" + roomId))
                .andExpect(status().isUnauthorized());
    }
}
