package com.devsync.bookmark.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookmarkResponse {
    private String id;
    private String entityType;
    private String entityId;
    private String title;
    private String subtitle;
    private String url;
    private Instant createdAt;
}
