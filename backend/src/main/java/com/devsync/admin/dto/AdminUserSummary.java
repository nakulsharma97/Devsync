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
public class AdminUserSummary {
    private String id;
    private String email;
    private String fullName;
    private String username;
    private String avatarUrl;
    private String role;
    private boolean blocked;
    private Instant createdAt;
}
