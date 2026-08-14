package com.devsync.billing.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class AdminSubscriptionListItem {
    private String id;
    private String userId;
    private String userName;
    private String userEmail;
    private String planCode;
    private String status;
    private Instant currentPeriodEnd;
    private boolean cancelAtPeriodEnd;
    private Instant createdAt;
}
