package com.devsync.billing.dto;

import lombok.Builder;
import lombok.Data;

/** Plan usage for the Billing page. limit = null means unlimited. */
@Data
@Builder
public class UsageResponse {
    private String planCode;
    private String planName;
    private PrivateProjectUsage privateProjects;
    private StorageUsage storage;
    private MemberUsage members;
    private boolean advancedAnalytics;

    @Data
    @Builder
    public static class PrivateProjectUsage {
        private long used;
        private Integer limit;
    }

    @Data
    @Builder
    public static class StorageUsage {
        private long usedBytes;
        private long limitBytes;
    }

    @Data
    @Builder
    public static class MemberUsage {
        private long maxInOwnedProject;
        private int limit;
    }
}
