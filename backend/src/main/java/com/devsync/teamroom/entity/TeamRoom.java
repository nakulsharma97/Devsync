package com.devsync.teamroom.entity;

import com.devsync.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "team_rooms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeamRoom extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(name = "project_id")
    private String projectId;

    @Column(name = "created_by", nullable = false)
    private String createdBy;

    @Column(columnDefinition = "TEXT")
    private String description;
}
