package com.devsync.feed.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostResponse {
    private String id;
    private String content;
    private String imageUrl;
    private String postType;
    private long likeCount;
    private long commentCount;
    private Instant createdAt;
    private Instant updatedAt;
    private UserInfo user;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserInfo {
        private String id;
        private String fullName;
        private String email;
        private String username;
        private String avatarUrl;
    }
}
