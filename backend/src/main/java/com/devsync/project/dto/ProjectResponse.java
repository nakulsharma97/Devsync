package com.devsync.project.dto;

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
public class ProjectResponse {
    private String id;
    private String name;
    private String description;
    private String ownerId;
    private String status;
    private String repositoryUrl;
    private String imageUrl;
    private int memberCount;
    private List<MemberDto> members;
    private String visibility;
    private String currentUserRole;
    private Instant createdAt;
    private Instant updatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MemberDto {
        private String id;
        private String userId;
        private String role;
        private String fullName;
        private String avatarUrl;
        private String username;
        private String presenceStatus;
        private java.time.Instant lastActiveAt;
    }
}
