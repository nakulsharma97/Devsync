package com.devsync.billing.dto;

import lombok.Builder;
import lombok.Data;

/**
 * Checkout response shaped per provider:
 * <ul>
 *   <li>Razorpay: orderId, amountPaise, currency, keyId (for the inline Checkout UI)</li>
 *   <li>Stripe: checkoutUrl (redirect to Stripe's hosted Checkout page)</li>
 * </ul>
 */
@Data
@Builder
public class CheckoutResponse {
    private String provider;
    private String planCode;
    private String planName;

    // Razorpay fields (populated when provider = RAZORPAY)
    private String orderId;
    private long amountPaise;
    private String currency;
    private String keyId;

    // Stripe fields (populated when provider = STRIPE)
    private String checkoutUrl;
}
