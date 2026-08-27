package com.devsync.billing.entity;

/**
 * Determines how a plan is billed:
 * <ul>
 *   <li>{@link #ONE_TIME} — fixed-period manual renewal (Razorpay or Stripe one-time checkout)</li>
 *   <li>{@link #RECURRING} — automatic recurring subscription (Stripe subscription checkout)</li>
 * </ul>
 */
public enum BillingMode {
    ONE_TIME,
    RECURRING
}
