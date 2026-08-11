package com.devsync.privacy;

import com.devsync.auth.JwtTokenProvider;
import com.devsync.feed.entity.Post;
import com.devsync.feed.repository.PostRepository;
import com.devsync.project.ProjectService;
import com.devsync.project.dto.CreateProjectRequest;
import com.devsync.teamroom.TeamRoomService;
import com.devsync.teamroom.dto.CreateRoomRequest;
import com.devsync.teamroom.entity.TeamRoomParticipant;
import com.devsync.teamroom.repository.TeamRoomParticipantRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Privacy audit: user search, other-user profiles, project members, room
 * participants and feed authors must never expose email, login timestamps or
 * account metadata. Self (and admin) views keep email.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PrivacyResponseIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private ProjectService projectService;
    @Autowired private TeamRoomService teamRoomService;
    @Autowired private TeamRoomParticipantRepository participantRepository;
    @Autowired private PostRepository postRepository;
    @Autowired private JwtTokenProvider jwtTokenProvider;

    private String aliceId;
    private String bobId;
    private String projectId;
    private String roomId;

    @BeforeEach
    void seed() {
        userRepository.deleteAll();
        participantRepository.deleteAll();
        postRepository.deleteAll();

        aliceId = createUser("alice@test.dev", "Alice").getId();
        bobId = createUser("bob@test.dev", "Bob").getId();

        CreateProjectRequest req = new CreateProjectRequest();
        req.setName("Squad");
        req.setVisibility("PRIVATE");
        projectId = projectService.createProject(req, aliceId).getId();
        projectService.addMember(projectId, bobId, "MEMBER", aliceId);

        CreateRoomRequest roomReq = new CreateRoomRequest();
        roomReq.setName("Squad Chat");
        roomReq.setProjectId(projectId);
        roomId = teamRoomService.createRoom(roomReq, aliceId).getId();
        participantRepository.save(TeamRoomParticipant.builder()
                .roomId(roomId).userId(bobId).build());

        postRepository.save(Post.builder().userId(bobId).content("Hello privacy").build());
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

    @Test
    void userSearch_neverExposesSensitiveFields() throws Exception {
        mockMvc.perform(get("/api/users").param("q", "ali").header("Authorization", bearer(bobId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(aliceId))
                .andExpect(jsonPath("$[0].fullName").value("Alice"))
                .andExpect(jsonPath("$[0].email").doesNotExist())
                .andExpect(jsonPath("$[0].lastLoginAt").doesNotExist())
                .andExpect(jsonPath("$[0].emailVerified").doesNotExist())
                .andExpect(jsonPath("$[0].authProvider").doesNotExist());
    }

    @Test
    void otherUserProfile_neverExposesSensitiveFields() throws Exception {
        mockMvc.perform(get("/api/users/" + aliceId).header("Authorization", bearer(bobId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Alice"))
                .andExpect(jsonPath("$.email").doesNotExist())
                .andExpect(jsonPath("$.lastLoginAt").doesNotExist())
                .andExpect(jsonPath("$.emailVerified").doesNotExist())
                .andExpect(jsonPath("$.authProvider").doesNotExist());
    }

    @Test
    void ownProfile_keepsEmail() throws Exception {
        mockMvc.perform(get("/api/users/me").header("Authorization", bearer(aliceId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("alice@test.dev"))
                .andExpect(jsonPath("$.lastLoginAt").exists());
    }

    @Test
    void projectMembers_neverExposeEmailOrLoginTime() throws Exception {
        mockMvc.perform(get("/api/projects/" + projectId).header("Authorization", bearer(bobId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.members[0].email").doesNotExist())
                .andExpect(jsonPath("$.members[0].lastLoginAt").doesNotExist())
                .andExpect(jsonPath("$.members[0].userId").exists())
                .andExpect(jsonPath("$.members[0].username").exists())
                .andExpect(jsonPath("$.members[0].role").exists());
    }

    @Test
    void roomParticipants_neverExposeEmail() throws Exception {
        mockMvc.perform(get("/api/rooms/" + roomId).header("Authorization", bearer(bobId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.participants[0].email").doesNotExist())
                .andExpect(jsonPath("$.participants[0].fullName").exists())
                .andExpect(jsonPath("$.participants[0].userId").exists());
    }

    @Test
    void feedAuthors_neverExposeEmail() throws Exception {
        mockMvc.perform(get("/api/posts/feed").header("Authorization", bearer(aliceId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].user.fullName").value("Bob"))
                .andExpect(jsonPath("$.data.content[0].user.email").doesNotExist());
    }
}
