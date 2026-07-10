package com.devsync.project.entity;

import com.devsync.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "projects")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Project extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "owner_id", nullable = false)
    private String ownerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ProjectStatus status = ProjectStatus.ACTIVE;

    @Column(name = "repository_url")
    private String repositoryUrl;

    @Column(name = "image_url")
    private String imageUrl;

    public enum ProjectStatus {
        ACTIVE, ARCHIVED, COMPLETED
    }
}
