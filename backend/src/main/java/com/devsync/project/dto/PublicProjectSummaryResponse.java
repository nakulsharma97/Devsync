package com.devsync.project.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Lightweight response for public project discovery. Excludes per-member
 * details (presence, lastActiveAt, per-member list) that are irrelevant
 * for anonymous discovery and leak unnecessary data.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicProjectSummaryResponse {
    private String id;
    private String name;
    private String description;
    private String ownerId;
    private String ownerName;
    private String ownerAvatarUrl;
    private String status;
    private String repositoryUrl;
    private String imageUrl;
    private int memberCount;
    private String visibility;
    private String currentUserJoinRequestStatus;
    private Instant createdAt;
    private Instant updatedAt;
}
