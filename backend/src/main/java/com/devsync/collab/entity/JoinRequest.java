package com.devsync.collab.entity;

import com.devsync.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "join_requests", uniqueConstraints = {
        @UniqueConstraint(name = "uk_join_request", columnNames = {"project_id", "user_id"})
}, indexes = {
        @Index(name = "idx_jr_project", columnList = "project_id, status"),
        @Index(name = "idx_jr_user", columnList = "user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JoinRequest extends BaseEntity {

    @Column(name = "project_id", nullable = false)
    private String projectId;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private JoinRequestStatus status = JoinRequestStatus.PENDING;

    @Column(length = 500)
    private String message;
}
