package com.devsync.notification.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {
    private String id;
    private String type;
    private String title;
    private String message;
    private String actorId;
    private String actorName;
    private String actorAvatar;
    private String referenceId;
    private String referenceType;
    private boolean read;
    private String actionUrl;
    private Instant createdAt;
}
