package com.devsync.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlatformStatsResponse {
    private long totalUsers;
    private long totalPosts;
    private long totalProjects;
    private long totalTeams;
    private long totalConnections;
}
