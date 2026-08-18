package com.devsync.kanban.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BoardResponse {
    private String id;
    private String name;
    private String projectId;
    private String description;
    private List<ColumnDto> columns;
    private Instant createdAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ColumnDto {
        private String id;
        private String name;
        private int position;
        private String color;
        private List<TaskDto> tasks;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskDto {
        private String id;
        private String title;
        private String description;
        private String columnId;
        /** Resolved column name (populated by calendar feeds for status display). */
        private String columnName;
        private int position;
        private String assigneeId;
        private String assigneeName;
        private String assigneeAvatar;
        private String priority;
        private Instant dueDate;
        private List<String> labels;
        private Instant createdAt;
        private String milestone;
        private String sprint;
        /** Task ids this task depends on (blocked-by). */
        private List<String> dependencies;

        // GitHub-based development workflow
        private String branchName;
        private Long pullRequestNumber;
        private String pullRequestUrl;
        private String pullRequestState;
        private java.time.Instant startedAt;
        private java.time.Instant prCreatedAt;
        private java.time.Instant prMergedAt;
    }
}
