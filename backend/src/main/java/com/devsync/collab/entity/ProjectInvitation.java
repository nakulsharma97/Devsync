package com.devsync.collab.entity;

import com.devsync.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "project_invitations", indexes = {
        @Index(name = "idx_inv_project", columnList = "project_id"),
        @Index(name = "idx_inv_receiver", columnList = "receiver_id, status"),
        @Index(name = "idx_inv_sender", columnList = "sender_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectInvitation extends BaseEntity {

    @Column(name = "project_id", nullable = false)
    private String projectId;

    @Column(name = "sender_id", nullable = false)
    private String senderId;

    @Column(name = "receiver_id", nullable = false)
    private String receiverId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private InvitationStatus status = InvitationStatus.PENDING;

    @Column(length = 500)
    private String message;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
}
