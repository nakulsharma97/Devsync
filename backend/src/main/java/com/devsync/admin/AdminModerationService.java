package com.devsync.admin;

import com.devsync.admin.dto.AdminFeedbackListItem;
import com.devsync.admin.dto.AdminReviewListItem;
import com.devsync.audit.AuditLogService;
import com.devsync.audit.entity.AuditAction;
import com.devsync.audit.entity.AuditStatus;
import com.devsync.common.PageResponse;
import com.devsync.common.ResourceNotFoundException;
import static com.devsync.common.StringUtils.blankToNull;
import com.devsync.feedback.entity.Feedback;
import com.devsync.feedback.entity.FeedbackCategory;
import com.devsync.feedback.entity.FeedbackStatus;
import com.devsync.feedback.repository.FeedbackRepository;
import com.devsync.review.entity.Review;
import com.devsync.review.entity.ReviewStatus;
import com.devsync.review.repository.ReviewRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collections;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Admin moderation of public reviews and private feedback. All endpoints are
 * behind /api/admin/** (ADMIN role enforced by SecurityConfig).
 */
@Service
@RequiredArgsConstructor
public class AdminModerationService {

    private static final int MAX_PAGE_SIZE = 100;

    private final ReviewRepository reviewRepository;
    private final FeedbackRepository feedbackRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    // ---------- Reviews ----------

    @Transactional(readOnly = true)
    public PageResponse<AdminReviewListItem> getReviews(int page, int size, String search, String status) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        ReviewStatus statusFilter = parseReviewStatus(status);
        String searchFilter = blankToNull(search);
        Page<Review> reviews = reviewRepository.searchAdminReviews(searchFilter, statusFilter, pageable);
        Map<String, User> userMap = loadUsers(reviews.getContent().stream().map(Review::getUserId).toList());
        return PageResponse.<AdminReviewListItem>builder()
                .content(reviews.getContent().stream().map(r -> toReviewItem(r, userMap.get(r.getUserId()))).toList())
                .page(reviews.getNumber())
                .size(reviews.getSize())
                .totalElements(reviews.getTotalElements())
                .totalPages(reviews.getTotalPages())
                .last(reviews.isLast())
                .build();
    }

    @Transactional(readOnly = true)
    public Map<String, Long> getReviewStats() {
        return Map.of(
                "pending", reviewRepository.countByStatus(ReviewStatus.PENDING),
                "approved", reviewRepository.countByStatus(ReviewStatus.APPROVED),
                "rejected", reviewRepository.countByStatus(ReviewStatus.REJECTED)
        );
    }

    @Transactional(readOnly = true)
    public Map<String, Long> getFeedbackStats() {
        return Map.of(
                "open", feedbackRepository.countByStatus(FeedbackStatus.OPEN),
                "inReview", feedbackRepository.countByStatus(FeedbackStatus.IN_REVIEW),
                "resolved", feedbackRepository.countByStatus(FeedbackStatus.RESOLVED),
                "closed", feedbackRepository.countByStatus(FeedbackStatus.CLOSED)
        );
    }

    @Transactional
    public AdminReviewListItem approveReview(String reviewId, String adminUsername) {
        Review review = requireReview(reviewId);
        if (review.getStatus() == ReviewStatus.REJECTED) {
            throw new IllegalArgumentException("Rejected reviews must be edited by the author before they can be approved.");
        }
        review.setStatus(ReviewStatus.APPROVED);
        review.setModeratedBy(adminUsername);
        review.setModeratedAt(Instant.now());
        reviewRepository.save(review);
        auditLogService.record(adminUsername, review.getUserId(), AuditAction.REVIEW_APPROVED, AuditStatus.SUCCESS,
                "Approved review " + review.getId());
        return toReviewItem(review, userRepository.findById(review.getUserId()).orElse(null));
    }

    @Transactional
    public AdminReviewListItem rejectReview(String reviewId, String adminUsername) {
        Review review = requireReview(reviewId);
        review.setStatus(ReviewStatus.REJECTED);
        review.setFeatured(false);
        review.setModeratedBy(adminUsername);
        review.setModeratedAt(Instant.now());
        reviewRepository.save(review);
        auditLogService.record(adminUsername, review.getUserId(), AuditAction.REVIEW_REJECTED, AuditStatus.SUCCESS,
                "Rejected review " + review.getId());
        return toReviewItem(review, userRepository.findById(review.getUserId()).orElse(null));
    }

    @Transactional
    public AdminReviewListItem setFeatured(String reviewId, boolean featured, String adminUsername) {
        Review review = requireReview(reviewId);
        if (featured && review.getStatus() != ReviewStatus.APPROVED) {
            throw new IllegalArgumentException("Only approved reviews can be featured.");
        }
        review.setFeatured(featured);
        reviewRepository.save(review);
        auditLogService.record(adminUsername, review.getUserId(), AuditAction.REVIEW_FEATURED, AuditStatus.SUCCESS,
                (featured ? "Featured" : "Unfeatured") + " review " + review.getId());
        return toReviewItem(review, userRepository.findById(review.getUserId()).orElse(null));
    }

    @Transactional
    public void deleteReview(String reviewId, String adminUsername) {
        Review review = requireReview(reviewId);
        reviewRepository.delete(review);
        auditLogService.record(adminUsername, review.getUserId(), AuditAction.REVIEW_DELETED, AuditStatus.SUCCESS,
                "Deleted review " + reviewId);
    }

    // ---------- Feedback ----------

    @Transactional(readOnly = true)
    public PageResponse<AdminFeedbackListItem> getFeedback(int page, int size, String search, String status, String category) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Feedback> feedback = feedbackRepository.searchAdminFeedback(
                blankToNull(search), parseFeedbackStatus(status), parseFeedbackCategory(category), pageable);
        Map<String, User> userMap = loadUsers(feedback.getContent().stream().map(Feedback::getUserId).toList());
        return PageResponse.<AdminFeedbackListItem>builder()
                .content(feedback.getContent().stream().map(f -> toFeedbackItem(f, userMap.get(f.getUserId()))).toList())
                .page(feedback.getNumber())
                .size(feedback.getSize())
                .totalElements(feedback.getTotalElements())
                .totalPages(feedback.getTotalPages())
                .last(feedback.isLast())
                .build();
    }

    @Transactional
    public AdminFeedbackListItem updateFeedbackStatus(String feedbackId, String status, String adminUsername) {
        Feedback feedback = feedbackRepository.findById(feedbackId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback", feedbackId));
        FeedbackStatus parsed = parseFeedbackStatus(status);
        if (parsed == null) {
            throw new IllegalArgumentException("Status is required");
        }
        feedback.setStatus(parsed);
        feedbackRepository.save(feedback);
        auditLogService.record(adminUsername, feedback.getUserId(), AuditAction.FEEDBACK_RECEIVED, AuditStatus.SUCCESS,
                "Feedback " + feedbackId + " moved to " + parsed);
        return toFeedbackItem(feedback, userRepository.findById(feedback.getUserId()).orElse(null));
    }

    // ---------- helpers ----------

    private Review requireReview(String reviewId) {
        return reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review", reviewId));
    }

    private AdminReviewListItem toReviewItem(Review review, User user) {
        return AdminReviewListItem.builder()
                .id(review.getId())
                .userId(review.getUserId())
                .reviewerName(user != null ? user.getFullName() : "Unknown")
                .reviewerUsername(user != null ? user.getUsername() : null)
                .reviewerEmail(user != null ? user.getEmail() : null)
                .reviewerAvatarUrl(user != null ? user.getAvatarUrl() : null)
                .rating(review.getRating())
                .title(review.getTitle())
                .comment(review.getComment())
                .category(review.getCategory().name())
                .status(review.getStatus().name())
                .featured(review.isFeatured())
                .moderatedBy(review.getModeratedBy())
                .moderatedAt(review.getModeratedAt())
                .createdAt(review.getCreatedAt())
                .build();
    }

    private AdminFeedbackListItem toFeedbackItem(Feedback feedback, User user) {
        return AdminFeedbackListItem.builder()
                .id(feedback.getId())
                .userId(feedback.getUserId())
                .userName(user != null ? user.getFullName() : "Unknown")
                .userUsername(user != null ? user.getUsername() : null)
                .userEmail(user != null ? user.getEmail() : null)
                .userAvatarUrl(user != null ? user.getAvatarUrl() : null)
                .category(feedback.getCategory().name())
                .message(feedback.getMessage())
                .rating(feedback.getRating())
                .status(feedback.getStatus().name())
                .adminNote(feedback.getAdminNote())
                .createdAt(feedback.getCreatedAt())
                .updatedAt(feedback.getUpdatedAt())
                .build();
    }

    private Map<String, User> loadUsers(java.util.Collection<String> userIds) {
        Set<String> ids = new HashSet<>(userIds);
        ids.remove(null);
        if (ids.isEmpty()) return Collections.emptyMap();
        return userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
    }

    private ReviewStatus parseReviewStatus(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return ReviewStatus.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid review status: " + raw);
        }
    }

    private FeedbackStatus parseFeedbackStatus(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return FeedbackStatus.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid feedback status: " + raw);
        }
    }

    private FeedbackCategory parseFeedbackCategory(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return FeedbackCategory.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid feedback category: " + raw);
        }
    }


}
