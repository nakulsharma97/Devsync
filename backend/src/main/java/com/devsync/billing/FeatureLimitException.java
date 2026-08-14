package com.devsync.billing;

import lombok.Getter;

/**
 * Raised when a plan entitlement limit is exceeded (private-project cap,
 * member cap, storage cap, paid feature). Mapped to HTTP 403 with a
 * machine-readable {@code code} so the frontend can show an upgrade CTA.
 */
@Getter
public class FeatureLimitException extends RuntimeException {

    private final String code;

    public FeatureLimitException(String code, String message) {
        super(message);
        this.code = code;
    }
}
