package com.devsync.message.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageResponse {
    private String id;
    private String senderId;
    private String senderName;
    private String senderAvatar;
    private String roomId;
    private String receiverId;
    private String content;
    private String messageType;
    private boolean systemMessage;
    private String attachmentId;
    private com.devsync.attachment.dto.AttachmentResponse attachment;
    private String status; // SENT / DELIVERED / READ
    private Instant readAt;
    private Instant createdAt;
}
