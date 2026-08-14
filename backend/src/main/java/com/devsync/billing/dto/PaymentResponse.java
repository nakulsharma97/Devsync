package com.devsync.billing.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

/** Safe payment history row — provider references only, no credentials. */
@Data
@Builder
public class PaymentResponse {
    private String id;
    private String planCode;
    private long amountPaise;
    private String currency;
    private String status;
    private String providerPaymentId;
    private Instant paidAt;
    private Instant createdAt;
}
