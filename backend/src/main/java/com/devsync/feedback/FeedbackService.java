package com.devsync.feedback;

import com.devsync.audit.AuditLogService;
import com.devsync.audit.entity.AuditAction;
import com.devsync.audit.entity.AuditStatus;
import com.devsync.feedback.dto.CreateFeedbackRequest;
import com.devsync.feedback.dto.FeedbackResponse;
import com.devsync.feedback.entity.Feedback;
import com.devsync.feedback.entity.FeedbackCategory;
import com.devsync.feedback.entity.FeedbackStatus;
import com.devsync.feedback.repository.FeedbackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FeedbackService {

    /** 10 submissions per day per user — plenty for honest reporting, bounded for spam. */
    private static final int SUBMIT_LIMIT = 10;
    private static final long SUBMIT_WINDOW_SECONDS = 86400;

    private final FeedbackRepository feedbackRepository;
    private final com.devsync.ratelimit.RateLimiter rateLimiter;
    private final AuditLogService auditLogService;

    @Transactional
    public FeedbackResponse create(String userId, CreateFeedbackRequest request) {
        if (!rateLimiter.tryAcquire("feedback:" + userId, SUBMIT_LIMIT, SUBMIT_WINDOW_SECONDS)) {
            throw new IllegalArgumentException("Too many feedback submissions. Please try again later.");
        }
        FeedbackCategory category = parseCategory(request.getCategory());
        Feedback feedback = feedbackRepository.save(Feedback.builder()
                .userId(userId)
                .category(category)
                .message(request.getMessage().trim())
                .rating(request.getRating())
                .status(FeedbackStatus.OPEN)
                .build());
        auditLogService.record(userId, userId, AuditAction.FEEDBACK_RECEIVED, AuditStatus.SUCCESS, "Private feedback submitted: " + category);
        return toResponse(feedback);
    }

    @Transactional(readOnly = true)
    public List<FeedbackResponse> getMyFeedback(String userId) {
        return feedbackRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    private FeedbackResponse toResponse(Feedback feedback) {
        return FeedbackResponse.builder()
                .id(feedback.getId())
                .category(feedback.getCategory().name())
                .message(feedback.getMessage())
                .rating(feedback.getRating())
                .status(feedback.getStatus().name())
                .createdAt(feedback.getCreatedAt())
                .updatedAt(feedback.getUpdatedAt())
                .build();
    }

    private FeedbackCategory parseCategory(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Category is required");
        }
        try {
            return FeedbackCategory.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid feedback category: " + raw);
        }
    }
}
