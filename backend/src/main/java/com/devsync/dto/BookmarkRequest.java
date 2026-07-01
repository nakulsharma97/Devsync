package com.devsync.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class BookmarkRequest {
    @NotBlank(message = "Repository name is required")
    @Size(max = 200, message = "Repository name must not exceed 200 characters")
    private String repoName;

    @NotBlank(message = "Repository URL is required")
    private String repoUrl;

    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    private String description;

    private String language;

    @Size(max = 200, message = "Owner must not exceed 200 characters")
    private String owner;

    private int stars;
}
