package com.devsync.billing.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class SubscriptionResponse {
    private String planCode;
    private String planName;
    private int priceInr;
    private String status;
    private String provider;
    private Instant currentPeriodStart;
    private Instant currentPeriodEnd;
    private boolean cancelAtPeriodEnd;
    private String billingMode;
}
