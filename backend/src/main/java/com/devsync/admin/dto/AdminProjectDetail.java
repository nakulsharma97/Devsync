package com.devsync.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminProjectDetail {
    private String id;
    private String name;
    private String description;
    private AdminProjectOwner owner;
    private String visibility;
    private String status;
    private long memberCount;
    private List<AdminProjectMember> members;
    private AdminKanbanStats kanbanStats;
    private long postsCount;
    private long messagesCount;
    private List<AdminActivityItem> recentActivity;
    private Instant createdAt;
    private Instant updatedAt;
}
