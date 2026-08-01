package com.devsync.bookmark.entity;

import com.devsync.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "bookmarks", uniqueConstraints = {
        @UniqueConstraint(name = "uk_bookmark", columnNames = {"user_id", "entity_type", "entity_id"})
}, indexes = {
        @Index(name = "idx_bookmarks_user", columnList = "user_id, created_at"),
        @Index(name = "idx_bookmarks_entity", columnList = "entity_type, entity_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Bookmark extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private String userId;

    /** PROJECT, TASK, POST or USER. */
    @Column(name = "entity_type", nullable = false)
    private String entityType;

    @Column(name = "entity_id", nullable = false)
    private String entityId;
}
