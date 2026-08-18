package com.devsync.kanban.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.Instant;

@Data
public class CreateTaskRequest {
    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    @NotBlank(message = "Column ID is required")
    private String columnId;

    private String assigneeId;
    private String priority;
    private Instant dueDate;
    /** When true (update only), explicitly removes the task's due date. */
    private Boolean clearDueDate;
    private String labels;
    private String milestone;
    private String sprint;
}
