package com.devsync.message.entity;

import com.devsync.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * A per-user read receipt for a room message. Direct messages track read state
 * directly on {@link Message} (a DM has exactly one recipient); room messages
 * are read per participant, which this table records.
 */
@Entity
@Table(name = "message_reads", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"message_id", "user_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageRead extends BaseEntity {

    @Column(name = "message_id", nullable = false)
    private String messageId;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "read_at", nullable = false)
    private Instant readAt;
}
