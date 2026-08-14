package com.devsync.publicapi.dto;

import lombok.Builder;
import lombok.Data;

/**
 * Aggregate platform statistics served to the public landing page. Only safe,
 * non-personal aggregates — never user lists, emails or private content.
 */
@Data
@Builder
public class PublicStatsResponse {
    private long users;
    private long projects;
    private long publicProjects;
    private long completedProjects;
    private long tasks;
    private long tasksCompleted;
    private long members;
    private long messages;
    private long githubRepos;
    private long reviews;
    private double averageRating;
}
