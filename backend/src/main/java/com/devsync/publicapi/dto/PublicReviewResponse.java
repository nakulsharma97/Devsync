package com.devsync.publicapi.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

/**
 * A review visible on the public landing page. Only APPROVED reviews are ever
 * mapped to this DTO. Never includes email, internal ids, or moderation state.
 */
@Data
@Builder
public class PublicReviewResponse {
    private String id;
    private int rating;
    private String title;
    private String comment;
    private String category;
    private String displayName;
    private String username;
    private String avatarUrl;
    private String jobTitle;
    private String company;
    private Instant createdAt;
}
