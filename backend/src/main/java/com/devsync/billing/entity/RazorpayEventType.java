package com.devsync.billing.entity;

/** Razorpay webhook event families we understand. Unknown events are recorded
 *  but never processed (defensive: never trust an unrecognized event). */
public enum RazorpayEventType {
    PAYMENT_CAPTURED,
    PAYMENT_FAILED,
    PAYMENT_REFUNDED,
    PAYMENT_PENDING,
    ORDER_PAID,
    SUBSCRIPTION_CANCELLED,
    SUBSCRIPTION_EXPIRED,
    SUBSCRIPTION_ACTIVATED,
    SUBSCRIPTION_CHANGED,
    UNKNOWN
}
