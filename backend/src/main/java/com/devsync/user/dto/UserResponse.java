package com.devsync.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private String id;
    private String email;
    private String fullName;
    private String username;
    private String avatarUrl;
    private String bio;
    private String jobTitle;
    private String company;
    private String location;
    private String githubUrl;
    private String twitterUrl;
    private String websiteUrl;
    private String role;
    private boolean emailVerified;
    private String authProvider;
    private Instant createdAt;
    private Instant lastLoginAt;
}
