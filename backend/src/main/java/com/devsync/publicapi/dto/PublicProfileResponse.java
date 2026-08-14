package com.devsync.publicapi.dto;

import com.devsync.analytics.dto.UserContributionsResponse;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

/**
 * Public profile — only information the user chose to share (profile fields set
 * by them) plus safe aggregate contribution stats. Never exposes email, internal
 * ids, security metadata or any private project data.
 */
@Data
@Builder
public class PublicProfileResponse {
    private String username;
    private String displayName;
    private String avatarUrl;
    private String bio;
    private String jobTitle;
    private String company;
    private String location;
    private Instant memberSince;
    private String presenceStatus;
    private UserContributionsResponse contributions;
}
