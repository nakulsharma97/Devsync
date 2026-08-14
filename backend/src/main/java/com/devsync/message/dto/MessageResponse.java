package com.devsync.message.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

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
    /** Reply threads: parent message id when this message is a reply. */
    private String parentMessageId;
    private boolean edited;
    private Instant editedAt;
    /** Aggregated reactions: { emoji, count, reactedByMe }. */
    private List<ReactionDto> reactions;
    /** Number of replies (top-level messages show 0 when none). */
    private long replyCount;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReactionDto {
        private String emoji;
        private long count;
        private boolean reactedByMe;
    }
}
