package com.devsync.social.entity;

import com.devsync.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * A directed "follows" relationship: {@code followerId} follows
 * {@code followingId}. Enforced one-directional with a unique constraint so a
 * user can follow another user at most once.
 */
@Entity
@Table(name = "user_follows",
       uniqueConstraints = @UniqueConstraint(name = "uk_user_follow", columnNames = {"follower_id", "following_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Follow extends BaseEntity {

    @Column(name = "follower_id", nullable = false, length = 36)
    private String followerId;

    @Column(name = "following_id", nullable = false, length = 36)
    private String followingId;
}
