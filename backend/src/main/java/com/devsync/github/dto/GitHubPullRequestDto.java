package com.devsync.github.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class GitHubPullRequestDto {
    private long number;
    private String title;
    private String state;
    private String reviewStatus; // OPEN | DRAFT | MERGED
    private String htmlUrl;
    private String authorLogin;
    private Instant createdAt;
    private Instant mergedAt;
    /** The PR's source branch (head). */
    private String headRef;
    /** The PR's target branch (base). */
    private String baseRef;
}
