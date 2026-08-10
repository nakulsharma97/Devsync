package com.devsync.github.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

/** Connection status — never includes the token. */
@Data
@Builder
public class GitHubConnectionResponse {
    private boolean connected;
    private String githubUsername;
    private String tokenScopes;
    private Instant connectedAt;
    private Instant lastSyncedAt;
}
