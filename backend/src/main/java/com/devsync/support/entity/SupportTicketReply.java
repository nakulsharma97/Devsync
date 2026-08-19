package com.devsync.support.entity;

import com.devsync.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "support_ticket_replies", indexes = {
    @Index(name = "idx_support_replies_ticket", columnList = "ticket_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SupportTicketReply extends BaseEntity {

    @Column(name = "ticket_id", nullable = false)
    private String ticketId;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    @Column(name = "is_admin_reply")
    @Builder.Default
    private boolean adminReply = false;

    @Column(name = "is_internal_note")
    @Builder.Default
    private boolean internalNote = false;
}
