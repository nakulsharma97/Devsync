package com.devsync.github.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class GitHubCommitDto {
    private String sha;
    private String message;
    private String authorName;
    private String authorLogin;
    private Instant timestamp;
}
