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
public class AdminPostResponse {
    private String id;
    private String content;
    private String imageUrl;
    private String postType;
    private long likeCount;
    private long commentCount;
    private Instant createdAt;
    private AdminPostAuthor author;
}
