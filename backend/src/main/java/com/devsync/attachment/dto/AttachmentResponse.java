package com.devsync.attachment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttachmentResponse {
    private String id;
    private String uploaderId;
    private String uploaderName;
    private String uploaderAvatar;
    private String projectId;
    private String contextType;
    private String contextId;
    private String fileName;
    private String contentType;
    private long size;
    private String url;
    private Instant createdAt;
}
