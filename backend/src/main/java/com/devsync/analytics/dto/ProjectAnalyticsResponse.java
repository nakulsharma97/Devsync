package com.devsync.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectAnalyticsResponse {
    private String projectId;
    private long totalMembers;
    private long completedTasks;
    private long pendingTasks;
    private long overdueTasks;
    private int completionPercentage;
    private Map<String, Long> tasksPerMember;
    private long messagesSent;
    private long postsCreated;
    private List<TrendPoint> activityTrend;
}
