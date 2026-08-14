package com.devsync.feedback.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class FeedbackResponse {
    private String id;
    private String category;
    private String message;
    private Integer rating;
    private String status;
    private Instant createdAt;
    private Instant updatedAt;
}
