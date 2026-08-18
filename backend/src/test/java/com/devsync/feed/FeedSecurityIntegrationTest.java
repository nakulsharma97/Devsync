package com.devsync.feed;

import com.devsync.auth.JwtTokenProvider;
import com.devsync.feed.entity.Comment;
import com.devsync.feed.entity.Post;
import com.devsync.feed.repository.CommentRepository;
import com.devsync.feed.repository.PostRepository;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end authorization tests for feed posts with REAL signed JWTs, the
 * full Spring context and H2. Ownership is derived from the authenticated
 * user — a client can never edit or delete another user's post by calling the
 * API directly; those requests must return 403.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FeedSecurityIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private PostRepository postRepository;
    @Autowired private CommentRepository commentRepository;
    @Autowired private JwtTokenProvider jwtTokenProvider;

    private String ownerId;
    private String strangerId;
    private String postId;

    @BeforeEach
    void seed() {
        postRepository.deleteAll();
        userRepository.deleteAll();

        ownerId = createUser("feed-owner@test.com").getId();
        strangerId = createUser("feed-stranger@test.com").getId();

        Post post = Post.builder()
                .userId(ownerId)
                .content("Original post")
                .postType("TEXT")
                .build();
        postId = postRepository.save(post).getId();
    }

    @Test
    void owner_canEditOwnPost() throws Exception {
        mockMvc.perform(put("/api/posts/{id}", postId)
                        .header("Authorization", bearer(ownerId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Edited by owner\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content").value("Edited by owner"))
                .andExpect(jsonPath("$.data.id").value(postId));
    }

    @Test
    void stranger_cannotEditOtherUsersPost_403() throws Exception {
        mockMvc.perform(put("/api/posts/{id}", postId)
                        .header("Authorization", bearer(strangerId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Hijacked edit\"}"))
                .andExpect(status().isForbidden());
        // Post content unchanged.
        org.assertj.core.api.Assertions.assertThat(
                postRepository.findById(postId).orElseThrow().getContent())
                .isEqualTo("Original post");
    }

    @Test
    void stranger_cannotDeleteOtherUsersPost_403() throws Exception {
        mockMvc.perform(delete("/api/posts/{id}", postId)
                        .header("Authorization", bearer(strangerId)))
                .andExpect(status().isForbidden());
        org.assertj.core.api.Assertions.assertThat(postRepository.existsById(postId)).isTrue();
    }

    @Test
    void owner_canDeleteOwnPost() throws Exception {
        mockMvc.perform(delete("/api/posts/{id}", postId)
                        .header("Authorization", bearer(ownerId)))
                .andExpect(status().isOk());
        org.assertj.core.api.Assertions.assertThat(postRepository.existsById(postId)).isFalse();
    }

    @Test
    void unauthenticated_cannotEditOrDelete_401() throws Exception {
        mockMvc.perform(put("/api/posts/{id}", postId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"No token\"}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/posts/{id}", postId))
                .andExpect(status().isUnauthorized());
    }

    // ── comment deletion permissions ─────────────────────────

    @Test
    void commentAuthor_canDeleteOwnComment() throws Exception {
        String commentId = seedComment(strangerId, "My own comment");

        mockMvc.perform(delete("/api/posts/comments/{id}", commentId)
                        .header("Authorization", bearer(strangerId)))
                .andExpect(status().isOk());
        org.assertj.core.api.Assertions.assertThat(commentRepository.existsById(commentId)).isFalse();
    }

    @Test
    void postOwner_canDeleteAnyCommentOnTheirPost() throws Exception {
        String commentId = seedComment(strangerId, "A comment on my post");

        mockMvc.perform(delete("/api/posts/comments/{id}", commentId)
                        .header("Authorization", bearer(ownerId)))
                .andExpect(status().isOk());
        org.assertj.core.api.Assertions.assertThat(commentRepository.existsById(commentId)).isFalse();
    }

    @Test
    void stranger_cannotDeleteAnotherUsersComment_403() throws Exception {
        // owner's own comment on their post; stranger tries to delete it.
        String commentId = seedComment(ownerId, "Owner's comment");

        mockMvc.perform(delete("/api/posts/comments/{id}", commentId)
                        .header("Authorization", bearer(strangerId)))
                .andExpect(status().isForbidden());
        org.assertj.core.api.Assertions.assertThat(commentRepository.existsById(commentId)).isTrue();
    }

    private String seedComment(String userId, String content) {
        Comment comment = commentRepository.save(Comment.builder()
                .userId(userId).postId(postId).content(content).build());
        return comment.getId();
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
