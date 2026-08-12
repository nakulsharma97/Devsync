package com.devsync.message.entity;

import com.devsync.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Message extends BaseEntity {

    @Column(name = "sender_id", nullable = false)
    private String senderId;

    @Column(name = "room_id")
    private String roomId;

    @Column(name = "receiver_id")
    private String receiverId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "message_type", nullable = false)
    @Builder.Default
    private String messageType = "text";

    @Column(name = "is_system_message")
    @Builder.Default
    private boolean systemMessage = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean hidden = false;

    @Column(name = "attachment_id")
    private String attachmentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private MessageStatus status = MessageStatus.SENT;

    @Column(name = "read_at")
    private Instant readAt;
}
