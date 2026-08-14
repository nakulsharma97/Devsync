package com.devsync.review;

import com.devsync.audit.AuditLogService;
import com.devsync.ratelimit.RateLimiter;
import com.devsync.review.dto.CreateReviewRequest;
import com.devsync.review.dto.ReviewResponse;
import com.devsync.review.entity.Review;
import com.devsync.review.entity.ReviewStatus;
import com.devsync.review.repository.ReviewRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReviewServiceTest {

    @Mock private ReviewRepository reviewRepository;
    @Mock private RateLimiter rateLimiter;
    @Mock private AuditLogService auditLogService;

    private ReviewService reviewService;

    @BeforeEach
    void setUp() {
        reviewService = new ReviewService(reviewRepository, rateLimiter, auditLogService);
    }

    private CreateReviewRequest validRequest() {
        CreateReviewRequest request = new CreateReviewRequest();
        request.setRating(5);
        request.setTitle("Great platform");
        request.setComment("Really smooth collaboration experience.");
        return request;
    }

    private Review savedReview() {
        Review review = Review.builder()
                .userId("u1")
                .rating(5)
                .title("Great platform")
                .comment("Really smooth collaboration experience.")
                .status(ReviewStatus.PENDING)
                .build();
        review.setId("r1");
        return review;
    }

    @Test
    void createReview_shouldSucceed_andStartPending() {
        when(rateLimiter.tryAcquire(eq("review:u1"), anyInt(), anyLong())).thenReturn(true);
        when(reviewRepository.existsByUserId("u1")).thenReturn(false);
        when(reviewRepository.save(any(Review.class))).thenAnswer(inv -> {
            Review review = inv.getArgument(0);
            review.setId("r1");
            return review;
        });

        ReviewResponse response = reviewService.createReview("u1", validRequest());

        assertThat(response.getStatus()).isEqualTo("PENDING");
        assertThat(response.getRating()).isEqualTo(5);
        assertThat(response.getComment()).isEqualTo("Really smooth collaboration experience.");
        verify(auditLogService).record(eq("u1"), eq("u1"), any(), any(), any());
    }

    @Test
    void createReview_shouldReject_duplicate() {
        when(rateLimiter.tryAcquire(eq("review:u1"), anyInt(), anyLong())).thenReturn(true);
        when(reviewRepository.existsByUserId("u1")).thenReturn(true);

        assertThatThrownBy(() -> reviewService.createReview("u1", validRequest()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already submitted feedback");

        verify(reviewRepository, never()).save(any());
    }

    @Test
    void createReview_shouldReject_ratingOutOfRange() {
        CreateReviewRequest request = validRequest();
        request.setRating(0);
        assertThatThrownBy(() -> reviewService.createReview("u1", request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Rating must be between 1 and 5");

        request.setRating(6);
        assertThatThrownBy(() -> reviewService.createReview("u1", request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Rating must be between 1 and 5");

        request.setRating(null);
        assertThatThrownBy(() -> reviewService.createReview("u1", request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Rating must be between 1 and 5");

        verify(reviewRepository, never()).save(any());
    }

    @Test
    void createReview_shouldReject_emptyComment() {
        CreateReviewRequest request = validRequest();
        request.setComment("   ");
        assertThatThrownBy(() -> reviewService.createReview("u1", request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Review text is required");

        request.setComment(null);
        assertThatThrownBy(() -> reviewService.createReview("u1", request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Review text is required");

        verify(reviewRepository, never()).save(any());
    }

    @Test
    void createReview_shouldReject_overlongComment() {
        CreateReviewRequest request = validRequest();
        request.setComment("x".repeat(2001));
        assertThatThrownBy(() -> reviewService.createReview("u1", request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("2000 characters");
        verify(reviewRepository, never()).save(any());
    }

    @Test
    void createReview_shouldBeRateLimited() {
        when(rateLimiter.tryAcquire(eq("review:u1"), anyInt(), anyLong())).thenReturn(false);

        assertThatThrownBy(() -> reviewService.createReview("u1", validRequest()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Too many review submissions");

        verify(reviewRepository, never()).save(any());
    }

    @Test
    void getMyReview_shouldReturnNull_whenNone() {
        when(reviewRepository.findByUserId("u1")).thenReturn(Optional.empty());
        assertThat(reviewService.getMyReview("u1")).isNull();
    }

    @Test
    void getMyReview_shouldReturnExisting() {
        Review review = savedReview();
        when(reviewRepository.findByUserId("u1")).thenReturn(Optional.of(review));

        ReviewResponse response = reviewService.getMyReview("u1");

        assertThat(response.getId()).isEqualTo("r1");
        assertThat(response.getStatus()).isEqualTo("PENDING");
    }

    @Test
    void updateMyReview_shouldResetToPending_whenNoExistingReview() {
        when(rateLimiter.tryAcquire(eq("review:u1"), anyInt(), anyLong())).thenReturn(true);
        when(reviewRepository.findByUserId("u1")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> reviewService.updateMyReview("u1", validRequest()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("have not submitted a review");
    }

    @Test
    void updateMyReview_shouldEditOwnReview_andReturnToModerationQueue() {
        Review review = savedReview();
        review.setStatus(ReviewStatus.APPROVED);
        review.setFeatured(true);
        when(rateLimiter.tryAcquire(eq("review:u1"), anyInt(), anyLong())).thenReturn(true);
        when(reviewRepository.findByUserId("u1")).thenReturn(Optional.of(review));

        CreateReviewRequest request = validRequest();
        request.setRating(4);
        request.setComment("Updated after using it more.");

        ReviewResponse response = reviewService.updateMyReview("u1", request);

        assertThat(response.getRating()).isEqualTo(4);
        assertThat(response.getStatus()).isEqualTo("PENDING");
        assertThat(response.isFeatured()).isFalse();
        verify(reviewRepository).save(review);
    }

    @Test
    void createReview_shouldReject_invalidCategory() {
        when(rateLimiter.tryAcquire(eq("review:u1"), anyInt(), anyLong())).thenReturn(true);
        when(reviewRepository.existsByUserId("u1")).thenReturn(false);
        CreateReviewRequest request = validRequest();
        request.setCategory("NOT_A_CATEGORY");

        assertThatThrownBy(() -> reviewService.createReview("u1", request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid review category");
    }
}
