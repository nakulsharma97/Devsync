package com.devsync.support.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class SupportTicketReplyResponse {
    private String id;
    private String ticketId;
    private String userId;
    private String userName;
    private String userAvatarUrl;
    private String message;
    private boolean adminReply;
    private boolean internalNote;
    private Instant createdAt;
}
