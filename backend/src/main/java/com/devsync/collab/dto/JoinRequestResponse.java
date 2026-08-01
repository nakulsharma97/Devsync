package com.devsync.collab.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JoinRequestResponse {
    private String id;
    private String projectId;
    private String projectName;
    private String userId;
    private String userName;
    private String userAvatar;
    private String status;
    private String message;
    private Instant createdAt;
}
