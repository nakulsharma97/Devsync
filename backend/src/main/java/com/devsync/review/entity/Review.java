package com.devsync.review.entity;

import com.devsync.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * A public product review submitted by an authenticated user. Reviews start in
 * PENDING and only become visible on the public landing page once an admin
 * approves them.
 */
@Entity
@Table(name = "reviews", indexes = {
        @Index(name = "idx_reviews_status", columnList = "status"),
        @Index(name = "idx_reviews_status_created", columnList = "status, created_at"),
        @Index(name = "idx_reviews_featured", columnList = "status, is_featured, created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Review extends BaseEntity {

    @Column(name = "user_id", nullable = false, unique = true)
    private String userId;

    @Column(nullable = false)
    private Integer rating;

    @Column(length = 120)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String comment;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ReviewCategory category = ReviewCategory.OVERALL_EXPERIENCE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ReviewStatus status = ReviewStatus.PENDING;

    @Column(name = "is_featured", nullable = false)
    @Builder.Default
    private boolean featured = false;

    @Column(name = "moderated_by")
    private String moderatedBy;

    @Column(name = "moderated_at")
    private Instant moderatedAt;
}
