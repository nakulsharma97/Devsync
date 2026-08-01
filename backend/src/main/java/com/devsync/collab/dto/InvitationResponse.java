package com.devsync.collab.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvitationResponse {
    private String id;
    private String projectId;
    private String projectName;
    private String senderId;
    private String senderName;
    private String senderAvatar;
    private String receiverId;
    private String receiverName;
    private String receiverAvatar;
    private String status;
    private String message;
    private Instant expiresAt;
    private Instant createdAt;
}
