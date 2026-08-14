package com.devsync.publicapi.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class PublicReviewsResponse {
    private List<PublicReviewResponse> reviews;
    private List<PublicReviewResponse> featured;
    private RatingSummaryResponse summary;
}
