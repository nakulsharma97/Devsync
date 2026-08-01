package com.devsync.bookmark.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class BookmarkRequest {
    @NotBlank(message = "entityType is required (PROJECT, TASK, POST, USER)")
    private String entityType;
    @NotBlank(message = "entityId is required")
    private String entityId;
}
