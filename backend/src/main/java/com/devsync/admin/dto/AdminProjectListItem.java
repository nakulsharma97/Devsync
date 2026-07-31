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
public class AdminProjectListItem {
    private String id;
    private String name;
    private String description;
    private String ownerId;
    private String ownerName;
    private String ownerEmail;
    private String ownerAvatarUrl;
    private String visibility;
    private String status;
    private long membersCount;
    private long tasksCount;
    private long postsCount;
    private Instant createdAt;
    private Instant updatedAt;
}
