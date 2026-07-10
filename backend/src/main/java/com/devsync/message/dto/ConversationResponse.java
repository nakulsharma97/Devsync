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
public class ConversationResponse {
    private String id;
    private String type; // "direct" or "room"
    private String name;
    private String projectName;
    private String avatarUrl;
    private String lastMessage;
    private Instant lastMessageAt;
    private int unreadCount;
    private int participantCount;

    // For direct messages
    private String otherUserId;
    private String otherUserName;

    // For room messages
    private String roomId;
}
