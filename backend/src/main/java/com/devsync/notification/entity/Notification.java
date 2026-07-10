package com.devsync.notification.entity;

import com.devsync.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(nullable = false)
    private String type; // INVITE, MENTION, TASK_ASSIGNED, PROJECT_UPDATE, etc.

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(name = "actor_id")
    private String actorId;

    @Column(name = "actor_name")
    private String actorName;

    @Column(name = "actor_avatar")
    private String actorAvatar;

    @Column(name = "reference_id")
    private String referenceId;

    @Column(name = "reference_type")
    private String referenceType; // "room", "project", "task", etc.

    @Column(name = "is_read")
    @Builder.Default
    private boolean read = false;

    @Column(name = "action_url")
    private String actionUrl;
}
