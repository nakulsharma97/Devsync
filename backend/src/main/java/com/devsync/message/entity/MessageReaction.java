package com.devsync.message.entity;

import com.devsync.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/** A single user's emoji reaction on a message (unique per message+user+emoji). */
@Entity
@Table(name = "message_reactions", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"message_id", "user_id", "emoji"})
}, indexes = {
        @Index(name = "idx_mr_message", columnList = "message_id"),
        @Index(name = "idx_mr_user", columnList = "user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageReaction extends BaseEntity {

    @Column(name = "message_id", nullable = false)
    private String messageId;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(nullable = false, length = 32)
    private String emoji;
}
