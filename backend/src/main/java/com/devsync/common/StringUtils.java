package com.devsync.common;

/**
 * Shared string helpers used by multiple services.
 * Stateless utility — no Spring bean required.
 */
public final class StringUtils {

    private StringUtils() {}

    /**
     * Returns {@code null} if the value is blank, otherwise the trimmed value.
     */
    public static String blankToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /**
     * Create a short text snippet for display in lists/previews.
     * Collapses whitespace and truncates to the given maximum length.
     *
     * @param content   the raw text (may be {@code null})
     * @param maxLength maximum characters before truncation (exclusive of "...")
     * @return trimmed snippet, or empty string if content is null
     */
    public static String snippet(String content, int maxLength) {
        if (content == null) return "";
        String trimmed = content.trim().replaceAll("\\s+", " ");
        return trimmed.length() > maxLength ? trimmed.substring(0, maxLength) + "..." : trimmed;
    }

    /**
     * Convenience overload with a default 80-character limit.
     */
    public static String snippet(String content) {
        return snippet(content, 80);
    }
}
