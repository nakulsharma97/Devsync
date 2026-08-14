package com.devsync.billing.entity;

/** Subscription lifecycle states mapped from provider events. */
public enum SubscriptionStatus {
    ACTIVE,      // paid and usable
    TRIALING,    // free trial (not used yet)
    PAST_DUE,    // renewal payment failed — grace period, entitlements kept
    CANCELLED,   // cancelled at period end (cancelAtPeriodEnd = true)
    EXPIRED,     // period ended without renewal
    INCOMPLETE   // checkout started but payment not confirmed
}
