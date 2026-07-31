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
public class AdminProjectSummary {
    private String id;
    private String name;
    private String status;
    private String ownerId;
    private Instant createdAt;
}
