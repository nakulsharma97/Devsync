package com.devsync.activity.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminActivityStats {
    private long todayCount;
    private long projects;
    private long tasks;
    private long messages;
}
