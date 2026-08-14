package com.devsync.billing.dto;

import lombok.Builder;
import lombok.Data;

/** Safe, public plan catalog entry (used by the pricing page). */
@Data
@Builder
public class PlanResponse {
    private String code;
    private String name;
    private String description;
    private int priceInr;
    private String currency;
    private Integer privateProjectLimit;
    private int membersPerProject;
    private long storageBytes;
    private boolean advancedAnalytics;
    private boolean customDomain;
    private boolean sso;
    private String auditLevel;
    private boolean prioritySupport;
}
