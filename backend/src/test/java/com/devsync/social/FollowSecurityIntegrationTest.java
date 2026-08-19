package com.devsync.social;

import com.devsync.auth.JwtTokenProvider;
import com.devsync.notification.entity.Notification;
import com.devsync.notification.repository.NotificationRepository;
import com.devsync.social.repository.FollowRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end tests for the follow system with REAL signed JWTs, the full Spring
 * context and H2. The actor is always derived from the authenticated user.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FollowSecurityIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private FollowRepository followRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private JwtTokenProvider jwtTokenProvider;

    private String aliceId;
    private String bobId;

    @BeforeEach
    void seed() {
        followRepository.deleteAll();
        notificationRepository.deleteAll();
        userRepository.deleteAll();

        aliceId = createUser("alice-follow@test.com").getId();
        bobId = createUser("bob-follow@test.com").getId();
    }

    @Test
    void alice_canFollowBob() throws Exception {
        mockMvc.perform(post("/api/connections/follow")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"followingId\":\"" + bobId + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.created").value(true));

        assertThat(followRepository.existsByFollowerIdAndFollowingId(aliceId, bobId)).isTrue();
        assertThat(followRepository.countByFollowingId(bobId)).isEqualTo(1);
    }

    @Test
    void duplicateFollow_isIgnored() throws Exception {
        follow(aliceId, bobId);
        follow(aliceId, bobId);

        assertThat(followRepository.countByFollowerId(aliceId)).isEqualTo(1);
        // only ONE notification for the single real follow
        assertThat(notificationRepository.findAll()).hasSize(1);
    }

    @Test
    void cannotFollowYourself_400() throws Exception {
        mockMvc.perform(post("/api/connections/follow")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"followingId\":\"" + aliceId + "\"}"))
                .andExpect(status().isBadRequest());

        assertThat(followRepository.countByFollowerId(aliceId)).isZero();
    }

    @Test
    void follow_createsNotificationForTarget() throws Exception {
        follow(aliceId, bobId);

        Notification notification = notificationRepository.findAll().stream()
                .filter(n -> n.getUserId().equals(bobId))
                .findFirst().orElseThrow();
        assertThat(notification.getType()).isEqualTo("NEW_FOLLOWER");
        assertThat(notification.getMessage()).contains("started following you");
        assertThat(notification.getActorId()).isEqualTo(aliceId);
    }

    @Test
    void alice_canUnfollowBob() throws Exception {
        follow(aliceId, bobId);
        assertThat(followRepository.countByFollowerId(aliceId)).isEqualTo(1);

        mockMvc.perform(post("/api/connections/unfollow")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"followingId\":\"" + bobId + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.removed").value(true));

        assertThat(followRepository.countByFollowerId(aliceId)).isZero();
    }

    @Test
    void followersAndFollowingLists_work() throws Exception {
        follow(bobId, aliceId); // bob follows alice

        mockMvc.perform(get("/api/connections/followers/{id}", aliceId)
                        .header("Authorization", bearer(aliceId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(bobId))
                .andExpect(jsonPath("$[0].isSelf").value(false));

        mockMvc.perform(get("/api/connections/following/{id}", bobId)
                        .header("Authorization", bearer(aliceId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(aliceId));
    }

    @Test
    void socialProfile_reportsCountsAndRelationship() throws Exception {
        follow(bobId, aliceId); // bob follows alice

        mockMvc.perform(get("/api/connections/profile/{username}", "bob-follow")
                        .header("Authorization", bearer(aliceId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.followingCount").value(1))
                .andExpect(jsonPath("$.followerCount").value(0))
                .andExpect(jsonPath("$.isFollowing").value(false))
                .andExpect(jsonPath("$.isSelf").value(false));

        // alice's own profile from alice's perspective
        mockMvc.perform(get("/api/connections/profile/{username}", "alice-follow")
                        .header("Authorization", bearer(aliceId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.followerCount").value(1))
                .andExpect(jsonPath("$.isFollowing").value(false))
                .andExpect(jsonPath("$.isSelf").value(true));
    }

    @Test
    void unauthenticated_cannotFollow_401() throws Exception {
        mockMvc.perform(post("/api/connections/follow")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"followingId\":\"" + bobId + "\"}"))
                .andExpect(status().isUnauthorized());
    }

    private void follow(String followerId, String followingId) throws Exception {
        mockMvc.perform(post("/api/connections/follow")
                        .header("Authorization", bearer(followerId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"followingId\":\"" + followingId + "\"}"))
                .andExpect(status().isOk());
    }

    private User createUser(String email) {
        User user = User.builder()
                .email(email)
                .password("$2a$10$abcdefghijklmnopqrstuv")
                .fullName("User " + email)
                .username(email.split("@")[0])
                .role(User.Role.USER)
                .emailVerified(true)
                .authProvider("email")
                .build();
        user.setId(null);
        return userRepository.save(user);
    }

    private String bearer(String userId) {
        String email = userRepository.findById(userId).orElseThrow().getEmail();
        return "Bearer " + jwtTokenProvider.generateAccessToken(userId, email);
    }
}
