package com.devsync.pinned.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PinnedProjectResponse {
    private String id;
    private String projectId;
    private String name;
    private String status;
    private int memberCount;
}
