package com.devsync.common;

/**
 * Thrown when an authenticated user is authorized to make a request but lacks
 * the required project role (e.g. a normal member attempting an owner-only
 * action). Mapped to HTTP 403 by {@link GlobalExceptionHandler}.
 */
public class ForbiddenException extends RuntimeException {

    public ForbiddenException(String message) {
        super(message);
    }
}
