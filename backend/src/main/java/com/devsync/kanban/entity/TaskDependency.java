package com.devsync.kanban.entity;

import com.devsync.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * task_id depends on depends_on_id (task_id is blocked until depends_on_id is
 * done). Cycles are rejected in the service layer; uniqueness prevents
 * duplicates.
 */
@Entity
@Table(name = "task_dependencies", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"task_id", "depends_on_id"})
}, indexes = {
        @Index(name = "idx_td_depends_on", columnList = "depends_on_id"),
        @Index(name = "idx_td_task", columnList = "task_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskDependency extends BaseEntity {

    @Column(name = "task_id", nullable = false)
    private String taskId;

    @Column(name = "depends_on_id", nullable = false)
    private String dependsOnId;
}
