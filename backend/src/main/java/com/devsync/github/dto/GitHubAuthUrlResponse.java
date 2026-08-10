package com.devsync.github.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GitHubAuthUrlResponse {
    private String url;
}
