package com.devsync.user.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
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
    // Social fields for Network page
    // NOTE: @JsonProperty is required on boolean fields starting with "is"
    // because Jackson strips the "is" prefix from boolean getters — e.g.
    // isFollowing() → serialized as "following" instead of "isFollowing".
    @JsonProperty("isSelf")
    private boolean isSelf;
    @JsonProperty("isFollowing")
    private boolean isFollowing;
    @JsonProperty("followsYou")
    private boolean followsYou;
    private long followerCount;
    private long followingCount;
}
