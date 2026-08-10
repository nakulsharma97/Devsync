package com.devsync.github.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
@Builder
public class GitHubIssueDto {
    private long number;
    private String title;
    private String state;
    private String htmlUrl;
    private String authorLogin;
    private String assigneeLogin;
    private List<String> labels;
    private Instant createdAt;
}
