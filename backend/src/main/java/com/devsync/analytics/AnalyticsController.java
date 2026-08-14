package com.devsync.analytics;

import com.devsync.analytics.dto.AdminAnalyticsResponse;
import com.devsync.analytics.dto.ProjectAnalyticsResponse;
import com.devsync.analytics.dto.UserContributionsResponse;
import com.devsync.billing.EntitlementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;
    private final EntitlementService entitlementService;

    @GetMapping("/projects/{projectId}/analytics")
    public ResponseEntity<ProjectAnalyticsResponse> projectAnalytics(
            @PathVariable String projectId,
            @RequestParam(defaultValue = "false") boolean advanced,
            @AuthenticationPrincipal UserDetails userDetails) {
        // Tiered analytics: the basic member view stays free; the advanced view
        // is a paid entitlement enforced here on the server (never frontend-only).
        if (advanced) {
            entitlementService.assertAdvancedAnalytics(userDetails.getUsername());
        }
        return ResponseEntity.ok(analyticsService.getProjectAnalytics(projectId, userDetails.getUsername()));
    }

    @GetMapping("/admin/analytics")
    public ResponseEntity<AdminAnalyticsResponse> adminAnalytics() {
        return ResponseEntity.ok(analyticsService.getAdminAnalytics());
    }

    @GetMapping("/users/{userId}/contributions")
    public ResponseEntity<UserContributionsResponse> contributions(@PathVariable String userId) {
        return ResponseEntity.ok(analyticsService.getUserContributions(userId));
    }
}
