package com.devsync.admin;

import com.devsync.admin.dto.AdminFeedbackListItem;
import com.devsync.admin.dto.AdminReviewListItem;
import com.devsync.common.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Admin review & feedback moderation. Everything under /api/admin/** requires
 * the ADMIN role (enforced in SecurityConfig — never frontend-only).
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminReviewController {

    private final AdminModerationService moderationService;

    // ---------- Public reviews ----------

    @GetMapping("/reviews")
    public ResponseEntity<PageResponse<AdminReviewListItem>> getReviews(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(moderationService.getReviews(page, size, search, status));
    }

    @GetMapping("/reviews/stats")
    public ResponseEntity<Map<String, Long>> getReviewStats() {
        return ResponseEntity.ok(moderationService.getReviewStats());
    }

    @PutMapping("/reviews/{reviewId}/approve")
    public ResponseEntity<AdminReviewListItem> approveReview(
            @PathVariable String reviewId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(moderationService.approveReview(reviewId, userDetails.getUsername()));
    }

    @PutMapping("/reviews/{reviewId}/reject")
    public ResponseEntity<AdminReviewListItem> rejectReview(
            @PathVariable String reviewId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(moderationService.rejectReview(reviewId, userDetails.getUsername()));
    }

    @PutMapping("/reviews/{reviewId}/feature")
    public ResponseEntity<AdminReviewListItem> setFeatured(
            @PathVariable String reviewId,
            @RequestBody(required = false) Map<String, Boolean> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        boolean featured = body != null && Boolean.TRUE.equals(body.get("featured"));
        return ResponseEntity.ok(moderationService.setFeatured(reviewId, featured, userDetails.getUsername()));
    }

    @DeleteMapping("/reviews/{reviewId}")
    public ResponseEntity<Void> deleteReview(
            @PathVariable String reviewId,
            @AuthenticationPrincipal UserDetails userDetails) {
        moderationService.deleteReview(reviewId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    // ---------- Private feedback ----------

    @GetMapping("/feedback")
    public ResponseEntity<PageResponse<AdminFeedbackListItem>> getFeedback(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category) {
        return ResponseEntity.ok(moderationService.getFeedback(page, size, search, status, category));
    }

    @GetMapping("/feedback/stats")
    public ResponseEntity<Map<String, Long>> getFeedbackStats() {
        return ResponseEntity.ok(moderationService.getFeedbackStats());
    }

    @PutMapping("/feedback/{feedbackId}/status")
    public ResponseEntity<AdminFeedbackListItem> updateFeedbackStatus(
            @PathVariable String feedbackId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(moderationService.updateFeedbackStatus(
                feedbackId, body.get("status"), userDetails.getUsername()));
    }
}
