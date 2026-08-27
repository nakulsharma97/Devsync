package com.devsync.billing.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class AdminRefundRequestItem {
    private String id;
    private String userId;
    private String userName;
    private String userEmail;
    private String paymentId;
    private String planCode;
    private long amountPaise;
    private String currency;
    private String reason;
    private String status;
    private String adminNote;
    private Instant reviewedAt;
    private Instant createdAt;
}
