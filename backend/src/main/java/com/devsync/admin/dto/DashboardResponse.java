package com.devsync.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {
    private long totalUsers;
    private long activeUsers;
    private long blockedUsers;
    private long totalProjects;
    private long totalTeams;
    private long totalTasks;
    private long totalMessages;
    private long totalPosts;
    private List<AdminUserSummary> recentUsers;
    private List<AdminProjectSummary> recentProjects;
}
