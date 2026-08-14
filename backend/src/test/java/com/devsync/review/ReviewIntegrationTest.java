package com.devsync.review;

import com.devsync.auth.JwtTokenProvider;
import com.devsync.feedback.entity.Feedback;
import com.devsync.feedback.entity.FeedbackCategory;
import com.devsync.feedback.entity.FeedbackStatus;
import com.devsync.feedback.repository.FeedbackRepository;
import com.devsync.review.entity.Review;
import com.devsync.review.entity.ReviewCategory;
import com.devsync.review.entity.ReviewStatus;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.review.repository.ReviewRepository;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Full review/feedback lifecycle over real HTTP (H2): submission, validation,
 * one-review-per-user, moderation workflow, public visibility rules and
 * authorization boundaries.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ReviewIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private ReviewRepository reviewRepository;
    @Autowired private FeedbackRepository feedbackRepository;
    @Autowired private ProjectRepository projectRepository;
    @Autowired private JwtTokenProvider jwtTokenProvider;

    private String aliceId;
    private String bobId;
    private String adminId;

    @BeforeEach
    void seed() {
        userRepository.deleteAll();
        reviewRepository.deleteAll();
        feedbackRepository.deleteAll();
        projectRepository.deleteAll();

        aliceId = createUser("alice@test.dev", "Alice", User.Role.USER).getId();
        bobId = createUser("bob@test.dev", "Bob", User.Role.USER).getId();
        adminId = createUser("admin@test.dev", "Admin One", User.Role.ADMIN).getId();
    }

    private User createUser(String email, String name, User.Role role) {
        User user = User.builder()
                .email(email)
                .username(email.split("@")[0])
                .fullName(name)
                .password("$2a$10$abcdefghijklmnopqrstuv")
                .emailVerified(true)
                .role(role)
                .build();
        return userRepository.save(user);
    }

    private String bearer(String userId) {
        return "Bearer " + jwtTokenProvider.generateAccessToken(userId, userId + "@test.dev");
    }

    private String reviewJson(int rating, String title, String comment) {
        return "{ \"rating\": " + rating + ", \"title\": \"" + title + "\", \"comment\": \"" + comment + "\" }";
    }

    // ---------- Review submission ----------

    @Test
    void createReview_shouldRequireAuthentication() throws Exception {
        mockMvc.perform(post("/api/reviews")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewJson(5, "Nice", "Great platform.")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createReview_shouldSucceed_andStayPending() throws Exception {
        mockMvc.perform(post("/api/reviews")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewJson(5, "Great", "Love the real-time chat.")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.rating").value(5));

        assertThat(reviewRepository.findByUserId(aliceId)).isPresent();
        // Not yet visible publicly.
        mockMvc.perform(get("/api/public/reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviews.length()").value(0))
                .andExpect(jsonPath("$.summary.totalReviews").value(0));
    }

    @Test
    void createReview_shouldReject_invalidRating() throws Exception {
        mockMvc.perform(post("/api/reviews")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewJson(0, "Bad", "Rating too low.")))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/reviews")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewJson(6, "Bad", "Rating too high.")))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/reviews")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"title\": \"No rating\", \"comment\": \"Missing rating field\" }"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createReview_shouldReject_emptyComment() throws Exception {
        mockMvc.perform(post("/api/reviews")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"rating\": 5, \"comment\": \"   \" }"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void duplicateReview_shouldBeRejected() throws Exception {
        mockMvc.perform(post("/api/reviews")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewJson(5, "One", "First review.")))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/reviews")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewJson(4, "Two", "Second review.")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("already submitted feedback")));

        assertThat(reviewRepository.findByUserId(aliceId).orElseThrow().getComment()).isEqualTo("First review.");
    }

    @Test
    void userCannotSubmitReview_forAnotherUser() throws Exception {
        // The userId always comes from the token; the request body has no user field.
        mockMvc.perform(post("/api/reviews")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewJson(5, "Hi", "Mine only.")))
                .andExpect(status().isOk());
        assertThat(reviewRepository.findByUserId(bobId)).isEmpty();
    }

    @Test
    void editOwnReview_shouldResetToPending() throws Exception {
        mockMvc.perform(post("/api/reviews")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewJson(5, "V1", "First version.")))
                .andExpect(status().isOk());

        // Admin approves it.
        String reviewId = reviewRepository.findByUserId(aliceId).orElseThrow().getId();
        mockMvc.perform(put("/api/admin/reviews/" + reviewId + "/approve")
                        .header("Authorization", bearer(adminId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        // Owner edits → back to PENDING and invisible publicly.
        mockMvc.perform(put("/api/reviews/me")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewJson(4, "V2", "Edited version.")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"));

        mockMvc.perform(get("/api/public/reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviews.length()").value(0));
    }

    // ---------- Public visibility ----------

    @Test
    void onlyApprovedReviews_arePublic_andNeverExposeEmail() throws Exception {
        reviewRepository.save(Review.builder().userId(aliceId).rating(5)
                .title("Great").comment("Alice loves it.").status(ReviewStatus.APPROVED).build());
        reviewRepository.save(Review.builder().userId(bobId).rating(2)
                .title("Pending").comment("Bob is pending.").status(ReviewStatus.PENDING).build());
        reviewRepository.save(Review.builder().userId(adminId).rating(1)
                .title("Rejected").comment("Admin rejected.").status(ReviewStatus.REJECTED).build());

        mockMvc.perform(get("/api/public/reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviews.length()").value(1))
                .andExpect(jsonPath("$.reviews[0].displayName").value("Alice"))
                .andExpect(jsonPath("$.reviews[0].rating").value(5))
                .andExpect(jsonPath("$.reviews[0].email").doesNotExist())
                .andExpect(jsonPath("$.reviews[0].userId").doesNotExist())
                .andExpect(jsonPath("$.reviews[0].status").doesNotExist())
                .andExpect(jsonPath("$.summary.totalReviews").value(1))
                .andExpect(jsonPath("$.summary.averageRating").value(5.0));
    }

    @Test
    void publicReviews_includeRatingDistribution() throws Exception {
        reviewRepository.save(Review.builder().userId(aliceId).rating(5).comment("a").status(ReviewStatus.APPROVED).build());
        reviewRepository.save(Review.builder().userId(bobId).rating(5).comment("b").status(ReviewStatus.APPROVED).build());
        reviewRepository.save(Review.builder().userId(adminId).rating(4).comment("c").status(ReviewStatus.APPROVED).build());

        mockMvc.perform(get("/api/public/reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.totalReviews").value(3))
                .andExpect(jsonPath("$.summary.averageRating").value(4.7))
                .andExpect(jsonPath("$.summary.distribution['5']").value(2))
                .andExpect(jsonPath("$.summary.distribution['4']").value(1))
                .andExpect(jsonPath("$.summary.distribution['1']").value(0));
    }

    // ---------- Admin moderation ----------

    @Test
    void nonAdmin_cannotModerateReviews() throws Exception {
        String reviewId = reviewRepository.save(Review.builder().userId(aliceId).rating(5)
                .comment("x").status(ReviewStatus.PENDING).build()).getId();

        mockMvc.perform(put("/api/admin/reviews/" + reviewId + "/approve")
                        .header("Authorization", bearer(bobId)))
                .andExpect(status().isForbidden());
        assertThat(reviewRepository.findById(reviewId).orElseThrow().getStatus()).isEqualTo(ReviewStatus.PENDING);

        // Unauthenticated moderation → 401.
        mockMvc.perform(put("/api/admin/reviews/" + reviewId + "/approve"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void adminApprove_makesReviewPublic() throws Exception {
        String reviewId = reviewRepository.save(Review.builder().userId(aliceId).rating(4)
                .comment("Solid.").status(ReviewStatus.PENDING).build()).getId();

        mockMvc.perform(put("/api/admin/reviews/" + reviewId + "/approve")
                        .header("Authorization", bearer(adminId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        mockMvc.perform(get("/api/public/reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviews[0].comment").value("Solid."));
    }

    @Test
    void adminReject_keepsReviewHidden() throws Exception {
        String reviewId = reviewRepository.save(Review.builder().userId(aliceId).rating(1)
                .comment("Spam.").status(ReviewStatus.PENDING).build()).getId();

        mockMvc.perform(put("/api/admin/reviews/" + reviewId + "/reject")
                        .header("Authorization", bearer(adminId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));

        mockMvc.perform(get("/api/public/reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviews.length()").value(0))
                .andExpect(jsonPath("$.summary.totalReviews").value(0));
    }

    @Test
    void onlyApprovedReviews_canBeFeatured() throws Exception {
        String pendingId = reviewRepository.save(Review.builder().userId(aliceId).rating(5)
                .comment("pending").status(ReviewStatus.PENDING).build()).getId();

        mockMvc.perform(put("/api/admin/reviews/" + pendingId + "/feature")
                        .header("Authorization", bearer(adminId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"featured\": true}"))
                .andExpect(status().isBadRequest());

        String approvedId = reviewRepository.save(Review.builder().userId(bobId).rating(5)
                .comment("approved").status(ReviewStatus.APPROVED).build()).getId();
        mockMvc.perform(put("/api/admin/reviews/" + approvedId + "/feature")
                        .header("Authorization", bearer(adminId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"featured\": true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.featured").value(true));

        mockMvc.perform(get("/api/public/reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.featured.length()").value(1))
                .andExpect(jsonPath("$.featured[0].comment").value("approved"));
    }

    @Test
    void adminDelete_removesReviewFromPublic() throws Exception {
        String reviewId = reviewRepository.save(Review.builder().userId(aliceId).rating(5)
                .comment("Gone soon.").status(ReviewStatus.APPROVED).build()).getId();

        mockMvc.perform(delete("/api/admin/reviews/" + reviewId)
                        .header("Authorization", bearer(adminId)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/public/reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviews.length()").value(0));
    }

    // ---------- Private feedback ----------

    @Test
    void privateFeedback_requiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/feedback")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"category\": \"BUG\", \"message\": \"Login breaks\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void privateFeedback_createAndReadOwn() throws Exception {
        mockMvc.perform(post("/api/feedback")
                        .header("Authorization", bearer(aliceId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"category\": \"BUG\", \"message\": \"Notifications duplicate\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OPEN"));

        // Alice sees her own feedback...
        mockMvc.perform(get("/api/feedback/me")
                        .header("Authorization", bearer(aliceId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].message").value("Notifications duplicate"));

        // ...but Bob does not.
        mockMvc.perform(get("/api/feedback/me")
                        .header("Authorization", bearer(bobId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void privateFeedback_neverAppearsOnPublicEndpoints() throws Exception {
        feedbackRepository.save(Feedback.builder().userId(aliceId)
                .category(FeedbackCategory.SECURITY)
                .message("Internal secret report")
                .status(FeedbackStatus.OPEN).build());

        mockMvc.perform(get("/api/public/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").doesNotExist());
        mockMvc.perform(get("/api/public/reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviews.length()").value(0));
    }

    @Test
    void nonAdmin_cannotViewAdminFeedbackList() throws Exception {
        mockMvc.perform(get("/api/admin/feedback")
                        .header("Authorization", bearer(bobId)))
                .andExpect(status().isForbidden());
    }

    @Test
    void admin_canUpdateFeedbackStatus() throws Exception {
        String id = feedbackRepository.save(Feedback.builder().userId(aliceId)
                .category(FeedbackCategory.FEATURE_REQUEST)
                .message("Add dark mode toggle")
                .status(FeedbackStatus.OPEN).build()).getId();

        mockMvc.perform(put("/api/admin/feedback/" + id + "/status")
                        .header("Authorization", bearer(adminId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\": \"IN_REVIEW\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_REVIEW"));
    }

    // ---------- Public stats ----------

    @Test
    void publicStats_returnSafeAggregates() throws Exception {
        mockMvc.perform(get("/api/public/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.users").value(3))
                .andExpect(jsonPath("$.projects").value(0))
                .andExpect(jsonPath("$.reviews").value(0))
                .andExpect(jsonPath("$.averageRating").value(0.0))
                // No personal data in the payload.
                .andExpect(jsonPath("$.emails").doesNotExist())
                .andExpect(jsonPath("$.usersList").doesNotExist());
    }

    @Test
    void publicStats_includeRealCounts() throws Exception {
        reviewRepository.save(Review.builder().userId(aliceId).rating(5).comment("yay").status(ReviewStatus.APPROVED).build());
        reviewRepository.save(Review.builder().userId(bobId).rating(3).comment("ok").status(ReviewStatus.PENDING).build());

        mockMvc.perform(get("/api/public/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviews").value(1))
                .andExpect(jsonPath("$.averageRating").value(5.0));
    }
}
