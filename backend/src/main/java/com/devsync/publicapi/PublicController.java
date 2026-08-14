package com.devsync.publicapi;

import com.devsync.billing.dto.PlanResponse;
import com.devsync.billing.PlanCatalogService;
import com.devsync.publicapi.dto.PublicProfileResponse;
import com.devsync.publicapi.dto.PublicReviewsResponse;
import com.devsync.publicapi.dto.PublicStatsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Public, unauthenticated landing-page endpoints. Only safe aggregates and
 * admin-approved content are served here (permitAll in SecurityConfig).
 */
@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicController {

    private final PublicStatsService publicStatsService;
    private final PlanCatalogService planCatalogService;
    private final PublicProfileService publicProfileService;

    @GetMapping("/users/{username}")
    public ResponseEntity<PublicProfileResponse> getPublicProfile(@PathVariable String username) {
        return ResponseEntity.ok(publicProfileService.getPublicProfile(username));
    }

    @GetMapping("/plans")
    public ResponseEntity<List<PlanResponse>> getPlans() {
        return ResponseEntity.ok(planCatalogService.getPlans());
    }

    @GetMapping("/stats")
    public ResponseEntity<PublicStatsResponse> getStats() {
        return ResponseEntity.ok(publicStatsService.getStats());
    }

    @GetMapping("/reviews")
    public ResponseEntity<PublicReviewsResponse> getReviews() {
        return ResponseEntity.ok(publicStatsService.getReviews());
    }
}
