package com.devsync.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminUserResponse {
    private String id;
    private String email;
    private String fullName;
    private String username;
    private String role;
    private String avatarUrl;
    private boolean blocked;
    private long postCount;
    private long followerCount;
    private Instant createdAt;
}
