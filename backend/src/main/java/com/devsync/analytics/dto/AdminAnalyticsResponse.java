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
public class AdminAnalyticsResponse {
    private long totalUsers;
    private long activeUsers;
    private long blockedUsers;
    private long totalProjects;
    private long privateProjects;
    private long publicProjects;
    private long totalTasks;
    private long totalMessages;
    private long totalPosts;
    private long totalReports;
    private long activeSessions;
    private List<TrendPoint> userGrowth;
    private List<TrendPoint> projectGrowth;
    private List<TrendPoint> taskCompletionTrend;
    private List<TrendPoint> dailyActivity;
    private List<TrendPoint> reportsTrend;
}
