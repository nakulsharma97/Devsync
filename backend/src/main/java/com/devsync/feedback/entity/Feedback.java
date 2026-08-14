package com.devsync.feedback.entity;

import com.devsync.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * Private product feedback. Visible only to the submitting user and to admins.
 */
@Entity
@Table(name = "feedback", indexes = {
        @Index(name = "idx_feedback_user", columnList = "user_id, created_at"),
        @Index(name = "idx_feedback_status", columnList = "status"),
        @Index(name = "idx_feedback_created", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Feedback extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FeedbackCategory category;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    private Integer rating;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private FeedbackStatus status = FeedbackStatus.OPEN;

    @Column(name = "admin_note")
    private String adminNote;
}
