package com.devsync.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Public-facing user profile for search results and other users' profiles.
 *
 * Deliberately excludes sensitive account data (email, emailVerified,
 * authProvider, lastLoginAt, global role) — those are only returned to the
 * account owner ({@link UserResponse} via /users/me) or to platform admins.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicUserResponse {
    private String id;
    private String username;
    private String fullName;
    private String avatarUrl;
    private String bio;
    private String jobTitle;
    private String company;
    private String location;
    private String githubUrl;
    private String twitterUrl;
    private String websiteUrl;
    private Instant createdAt;
    private String presenceStatus;
    private Instant lastActiveAt;
}
