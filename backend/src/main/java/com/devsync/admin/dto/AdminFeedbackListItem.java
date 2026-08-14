package com.devsync.admin.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class AdminFeedbackListItem {
    private String id;
    private String userId;
    private String userName;
    private String userUsername;
    private String userEmail;
    private String userAvatarUrl;
    private String category;
    private String message;
    private Integer rating;
    private String status;
    private String adminNote;
    private Instant createdAt;
    private Instant updatedAt;
}
