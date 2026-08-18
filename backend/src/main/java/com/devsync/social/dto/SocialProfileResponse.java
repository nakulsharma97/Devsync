package com.devsync.social.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Authenticated profile view: public profile fields plus social stats
 * (posts / followers / following counts) and the requesting user's
 * relationship to the profile owner.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SocialProfileResponse {
    private String id;
    private String username;
    private String displayName;
    private String avatarUrl;
    private String bio;
    private String jobTitle;
    private String company;
    private String location;
    private Instant memberSince;
    private long posts;
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
