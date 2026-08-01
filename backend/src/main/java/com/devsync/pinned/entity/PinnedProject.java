package com.devsync.pinned.entity;

import com.devsync.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "pinned_projects", uniqueConstraints = {
        @UniqueConstraint(name = "uk_pinned", columnNames = {"user_id", "project_id"})
}, indexes = {
        @Index(name = "idx_pinned_user", columnList = "user_id, position")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PinnedProject extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "project_id", nullable = false)
    private String projectId;

    @Column(nullable = false)
    private int position;
}
