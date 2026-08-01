package com.devsync.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserContributionsResponse {
    private long projectsCreated;
    private long tasksCompleted;
    private long messagesSent;
    private long postsCreated;
    private long commentsAdded;
    private int currentStreak;
    private List<TrendPoint> monthlyActivity;
    private List<TrendPoint> heatmap;
}
