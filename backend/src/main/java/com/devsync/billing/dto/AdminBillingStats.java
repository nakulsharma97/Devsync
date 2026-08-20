package com.devsync.billing.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AdminBillingStats {
    private long totalSubscriptions;
    private long activeSubscriptions;
    private long cancelledSubscriptions;
    private long expiredSubscriptions;
    private long pastDueSubscriptions;
    private long freeUsers;
    private long proUsers;
    private long enterpriseUsers;
    private long totalPayments;
    private long successfulPayments;
    private long failedPayments;
    private long refundedPayments;
    private long totalRevenuePaise;
    private long revenueThisMonthPaise;
    private long revenueThisYearPaise;
}
