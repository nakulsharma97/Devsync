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

    // ── GitHub-based development workflow ────────────────────

    /** The feature branch this task is being worked on (e.g. feature/login-api). */
    @Column(name = "branch_name")
    private String branchName;

    /** Number of the linked GitHub pull request (null until a PR exists). */
    @Column(name = "pull_request_number")
    private Long pullRequestNumber;

    /** GitHub URL of the linked pull request. */
    @Column(name = "pull_request_url")
    private String pullRequestUrl;

    /**
     * Current PR lifecycle state, synced from real GitHub state:
     * OPEN | CHANGES_REQUESTED | APPROVED | MERGED | CLOSED.
     */
    @Column(name = "pull_request_state")
    private String pullRequestState;

    /** When the assignee started work on this task. */
    @Column(name = "started_at")
    private Instant startedAt;

    /** When the linked pull request was created on GitHub. */
    @Column(name = "pr_created_at")
    private Instant prCreatedAt;

    /** When the linked pull request was merged on GitHub. */
    @Column(name = "pr_merged_at")
    private Instant prMergedAt;

    public enum Priority {
        LOW, MEDIUM, HIGH, CRITICAL
    }
}
