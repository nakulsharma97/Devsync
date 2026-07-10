package com.devsync.project.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProjectRequest {
    @Size(max = 200, message = "Project name must be at most 200 characters")
    private String name;

    @Size(max = 2000, message = "Description must be at most 2000 characters")
    private String description;

    private String status;
    private String repositoryUrl;
    private String imageUrl;
}
