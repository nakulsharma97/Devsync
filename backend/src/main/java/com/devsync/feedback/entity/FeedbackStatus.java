package com.devsync.feedback.entity;

/**
 * Lifecycle of private product feedback. Private feedback is never shown
 * publicly — only admins see it and can move it through the workflow.
 */
public enum FeedbackStatus {
    OPEN,
    IN_REVIEW,
    RESOLVED,
    CLOSED
}
