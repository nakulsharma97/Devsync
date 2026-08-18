package com.devsync.social.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A user row shown in followers/following lists, including the requesting
 * user's relationship to them (isFollowing / followsYou / isSelf).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FollowUserResponse {
    private String id;
    private String username;
    private String fullName;
    private String avatarUrl;
    private String bio;
    private long followerCount;
    private long followingCount;
    private boolean isFollowing;
    private boolean followsYou;
    private boolean isSelf;

    @JsonProperty("isFollowing")
    public boolean isFollowing() {
        return isFollowing;
    }

    @JsonProperty("isSelf")
    public boolean isSelf() {
        return isSelf;
    }
}
