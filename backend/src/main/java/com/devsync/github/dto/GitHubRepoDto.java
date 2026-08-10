package com.devsync.github.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class GitHubRepoDto {
    private Long id;
    private String fullName;
    private String name;
    private String description;
    private String htmlUrl;
    private String visibility;   // public | private
    private String language;
    private int stargazersCount;
    private int forksCount;
    private String defaultBranch;
    private Instant updatedAt;
}
