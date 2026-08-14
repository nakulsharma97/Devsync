package com.devsync.kanban.entity;

import com.devsync.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "tasks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Task extends BaseEntity {

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "column_id", nullable = false)
    private String columnId;

    @Column(name = "board_id", nullable = false)
    private String boardId;

    @Column(nullable = false)
    private int position;

    @Column(name = "assignee_id")
    private String assigneeId;

    @Column(name = "priority")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Priority priority = Priority.MEDIUM;

    @Column(name = "due_date")
    private Instant dueDate;

    @Column(name = "labels")
    private String labels; // Comma-separated

    /** Optional milestone grouping label (e.g. "v2.0", "Launch"). */
    @Column(name = "milestone")
    private String milestone;

    /** Optional sprint grouping label (e.g. "Sprint 12"). */
    @Column(name = "sprint")
    private String sprint;

    public enum Priority {
        LOW, MEDIUM, HIGH, CRITICAL
    }
}
