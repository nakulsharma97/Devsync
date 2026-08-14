package com.devsync.publicapi.dto;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

/**
 * Aggregate rating derived from APPROVED reviews only. Always computed in the
 * database — never hardcoded.
 */
@Data
@Builder
public class RatingSummaryResponse {
    private double averageRating;
    private long totalReviews;
    private Map<Integer, Long> distribution;
}
