package com.devsync.support.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class SupportTicketResponse {
    private String id;
    private String ticketNumber;
    private String userId;
    private String userName;
    private String userEmail;
    private String userAvatarUrl;
    private String subject;
    private String description;
    private String status;
    private String priority;
    private String category;
    private String assignedTo;
    private String assignedToName;
    private long replyCount;
    private Instant resolvedAt;
    private Instant closedAt;
    private Instant createdAt;
    private Instant updatedAt;
}
