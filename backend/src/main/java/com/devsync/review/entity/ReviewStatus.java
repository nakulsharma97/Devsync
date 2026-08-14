package com.devsync.review.entity;

/**
 * Moderation lifecycle of a public review. Only APPROVED reviews are ever
 * served by the public landing-page API.
 */
public enum ReviewStatus {
    PENDING,
    APPROVED,
    REJECTED
}
