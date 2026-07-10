package com.devsync.kanban.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateTaskPositionRequest {
    @NotBlank(message = "Task ID is required")
    private String taskId;

    @NotBlank(message = "New column ID is required")
    private String newColumnId;

    private int newPosition;
}
