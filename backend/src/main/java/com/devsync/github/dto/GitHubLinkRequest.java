package com.devsync.github.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GitHubLinkRequest {
    @NotBlank(message = "repoFullName is required")
    private String repoFullName;
}
