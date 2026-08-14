package com.devsync.project.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateProjectRequest {
    @NotBlank(message = "Project name is required")
    @Size(max = 200, message = "Project name must be at most 200 characters")
    private String name;

    @Size(max = 2000, message = "Description must be at most 2000 characters")
    private String description;

    /** PUBLIC or PRIVATE (case-insensitive). Defaults to PRIVATE when omitted. */
    @Pattern(regexp = "(?i)^(PUBLIC|PRIVATE)$", message = "Visibility must be PUBLIC or PRIVATE")
    private String visibility;

    private String repositoryUrl;
    private String imageUrl;

    /** Optional project template: SPRINT_BOARD, BUG_TRACKER, FEATURE_BACKLOG. */
    @Pattern(regexp = "(?i)^(SPRINT_BOARD|BUG_TRACKER|FEATURE_BACKLOG)$",
            message = "Template must be SPRINT_BOARD, BUG_TRACKER or FEATURE_BACKLOG")
    private String template;
}
