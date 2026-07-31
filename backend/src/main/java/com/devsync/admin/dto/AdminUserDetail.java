package com.devsync.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminUserDetail {
    private String id;
    private String email;
    private String fullName;
    private String username;
    private String avatarUrl;
    private String bio;
    private String jobTitle;
    private String company;
    private String location;
    private String role;
    private String status;
    private boolean emailVerified;
    private String authProvider;
    private Instant createdAt;
    private Instant lastLoginAt;
    private List<AdminProjectSummary> projectsJoined;
    private List<AdminProjectSummary> projectsOwned;
    private List<AdminTeamSummary> teams;
    private long postsCount;
    private long messagesCount;
}
