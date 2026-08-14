package com.devsync.review.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

/**
 * User-facing review response. Includes the moderation status so the owner can
 * see their review is pending, and only safe reviewer profile fields.
 */
@Data
@Builder
public class ReviewResponse {
    private String id;
    private Integer rating;
    private String title;
    private String comment;
    private String category;
    private String status;
    private boolean featured;
    private Instant createdAt;
    private Instant updatedAt;
}
