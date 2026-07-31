package com.devsync.activity.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActivityResponse {
    private String id;
    private ActivityUserDto user;
    private String projectId;
    private String activityType;
    private String title;
    private String description;
    private Instant createdAt;
}
