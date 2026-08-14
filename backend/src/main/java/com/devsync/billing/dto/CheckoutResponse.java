package com.devsync.billing.dto;

import lombok.Builder;
import lombok.Data;

/** Response handed to the Razorpay Checkout UI. */
@Data
@Builder
public class CheckoutResponse {
    private String orderId;
    private long amountPaise;
    private String currency;
    private String keyId;
    private String planCode;
    private String planName;
}
