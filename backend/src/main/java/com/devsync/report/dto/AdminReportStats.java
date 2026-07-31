package com.devsync.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminReportStats {
    private long total;
    private long pending;
    private long underReview;
    private long resolved;
    private long rejected;
}
