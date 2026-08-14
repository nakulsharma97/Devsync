package com.devsync.admin.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class AdminReviewListItem {
    private String id;
    private String userId;
    private String reviewerName;
    private String reviewerUsername;
    private String reviewerEmail;
    private String reviewerAvatarUrl;
    private int rating;
    private String title;
    private String comment;
    private String category;
    private String status;
    private boolean featured;
    private String moderatedBy;
    private Instant moderatedAt;
    private Instant createdAt;
}
