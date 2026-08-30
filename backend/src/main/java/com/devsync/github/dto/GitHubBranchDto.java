package com.devsync.github.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GitHubBranchDto {
    private String name;
    private boolean isProtected;
}
