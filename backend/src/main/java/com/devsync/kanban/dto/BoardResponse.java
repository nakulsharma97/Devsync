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
        private int position;
        private String assigneeId;
        private String assigneeName;
        private String assigneeAvatar;
        private String priority;
        private Instant dueDate;
        private List<String> labels;
        private Instant createdAt;
    }
}
