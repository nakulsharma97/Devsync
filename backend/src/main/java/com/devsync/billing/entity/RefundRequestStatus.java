package com.devsync.billing.entity;

/** Self-serve refund request lifecycle states. */
public enum RefundRequestStatus {
    PENDING,    // submitted by user, awaiting admin review
    APPROVED,   // admin approved — refund issued to Razorpay, awaiting webhook confirmation
    REJECTED,   // admin rejected with a note
    COMPLETED   // Razorpay refund confirmed via refund.processed webhook
}
