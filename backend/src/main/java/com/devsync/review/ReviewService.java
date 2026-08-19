package com.devsync.review;

import com.devsync.audit.AuditLogService;
import com.devsync.audit.entity.AuditAction;
import com.devsync.audit.entity.AuditStatus;
import com.devsync.ratelimit.RateLimiter;
import com.devsync.review.dto.CreateReviewRequest;
import com.devsync.review.dto.ReviewResponse;
import com.devsync.review.entity.Review;
import com.devsync.review.entity.ReviewCategory;
import com.devsync.review.entity.ReviewStatus;
import com.devsync.review.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class ReviewService {

    /** One submission + edits per user per hour keeps review spam bounded. */
    private static final int SUBMIT_LIMIT = 5;
    private static final long SUBMIT_WINDOW_SECONDS = 3600;

    private final ReviewRepository reviewRepository;
    private final RateLimiter rateLimiter;
    private final AuditLogService auditLogService;

    @Transactional
    public ReviewResponse createReview(String userId, CreateReviewRequest request) {
        validate(request);
        if (!rateLimiter.tryAcquire("review:" + userId, SUBMIT_LIMIT, SUBMIT_WINDOW_SECONDS)) {
            throw new IllegalArgumentException("Too many review submissions. Please try again later.");
        }
        if (reviewRepository.existsByUserId(userId)) {
            throw new IllegalArgumentException("You already submitted feedback. You can edit your existing review instead.");
        }
        ReviewCategory category = parseCategory(request.getCategory());
        Review review = reviewRepository.save(Review.builder()
                .userId(userId)
                .rating(request.getRating())
                .title(blankToNull(request.getTitle()))
                .comment(request.getComment().trim())
                .category(category)
                .status(ReviewStatus.PENDING)
                .build());
        auditLogService.record(userId, userId, AuditAction.REVIEW_SUBMITTED, AuditStatus.SUCCESS, "Review submitted for moderation");
        return toResponse(review);
    }

    @Transactional(readOnly = true)
    public ReviewResponse getMyReview(String userId) {
        return reviewRepository.findByUserId(userId)
                .map(this::toResponse)
                .orElse(null);
    }

    @Transactional
    public ReviewResponse updateMyReview(String userId, CreateReviewRequest request) {
        validate(request);
        if (!rateLimiter.tryAcquire("review:" + userId, SUBMIT_LIMIT, SUBMIT_WINDOW_SECONDS)) {
            throw new IllegalArgumentException("Too many review submissions. Please try again later.");
        }
        Review review = reviewRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("You have not submitted a review yet."));
        review.setRating(request.getRating());
        review.setTitle(blankToNull(request.getTitle()));
        review.setComment(request.getComment().trim());
        review.setCategory(parseCategory(request.getCategory()));
        // An edit returns the review to the moderation queue.
        review.setStatus(ReviewStatus.PENDING);
        review.setFeatured(false);
        review.setModeratedBy(null);
        review.setModeratedAt(null);
        reviewRepository.save(review);
        auditLogService.record(userId, userId, AuditAction.REVIEW_SUBMITTED, AuditStatus.SUCCESS, "Review edited and resubmitted for moderation");
        return toResponse(review);
    }

    private ReviewResponse toResponse(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .rating(review.getRating())
                .title(review.getTitle())
                .comment(review.getComment())
                .category(review.getCategory() != null
                        ? review.getCategory().name()
                        : ReviewCategory.OVERALL_EXPERIENCE.name())
                .status(review.getStatus() != null ? review.getStatus().name() : ReviewStatus.PENDING.name())
                .featured(review.isFeatured())
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .build();
    }

    private void validate(CreateReviewRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Review is required");
        }
        if (request.getRating() == null || request.getRating() < 1 || request.getRating() > 5) {
            throw new IllegalArgumentException("Rating must be between 1 and 5");
        }
        if (request.getComment() == null || request.getComment().isBlank()) {
            throw new IllegalArgumentException("Review text is required");
        }
        if (request.getComment().trim().length() > 2000) {
            throw new IllegalArgumentException("Review must be at most 2000 characters");
        }
        if (request.getTitle() != null && request.getTitle().trim().length() > 120) {
            throw new IllegalArgumentException("Title must be at most 120 characters");
        }
    }

    private ReviewCategory parseCategory(String raw) {
        if (raw == null || raw.isBlank()) return ReviewCategory.OVERALL_EXPERIENCE;
        try {
            return ReviewCategory.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid review category: " + raw);
        }
    }

    private String blankToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
