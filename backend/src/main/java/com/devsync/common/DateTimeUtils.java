package com.devsync.common;

import java.time.Instant;

/**
 * Shared date/time parsing helpers used by multiple services.
 * Stateless utility — no Spring bean required.
 */
public final class DateTimeUtils {

    private DateTimeUtils() {}

    /**
     * Parse an ISO-8601 instant string. Returns {@code null} for blank input.
     *
     * @throws IllegalArgumentException if the string is non-blank but not a valid instant
     */
    public static Instant parseInstant(String raw) {
        return parseInstant(raw, "Invalid date");
    }

    /**
     * Parse an ISO-8601 instant string with a custom error message prefix.
     * Returns {@code null} for blank input.
     *
     * @throws IllegalArgumentException if the string is non-blank but not a valid instant
     */
    public static Instant parseInstant(String raw, String message) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return Instant.parse(raw);
        } catch (Exception e) {
            throw new IllegalArgumentException(message + ": " + raw);
        }
    }
}
