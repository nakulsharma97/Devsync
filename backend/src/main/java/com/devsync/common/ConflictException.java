package com.devsync.common;

import lombok.Getter;

/**
 * Raised when a concurrent modification is detected (optimistic locking conflict).
 * Maps to HTTP 409 Conflict with a machine-readable code so the frontend can
 * display a useful message.
 */
@Getter
public class ConflictException extends RuntimeException {

    private final String code;

    public ConflictException(String code, String message) {
        super(message);
        this.code = code;
    }

    public ConflictException(String message) {
        this("RESOURCE_MODIFIED", message);
    }
}
