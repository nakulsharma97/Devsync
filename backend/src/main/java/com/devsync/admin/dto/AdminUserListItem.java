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
public class AdminUserListItem {
    private String id;
    private String avatarUrl;
    private String fullName;
    private String username;
    private String email;
    private String role;
    private String status;
    private Instant createdAt;
    private Instant lastLoginAt;
}
