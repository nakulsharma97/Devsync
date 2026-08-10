package com.devsync.github.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class GitHubLinkResponse {
    private String projectId;
    private Long repoId;
    private String repoFullName;
    private String repoUrl;
    private String repoDescription;
    private String repoVisibility;
    private String repoLanguage;
    private String repoDefaultBranch;
    private Instant linkedAt;
}
