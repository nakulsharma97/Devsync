package com.devsync.billing;

import com.devsync.billing.dto.AdminBillingStats;
import com.devsync.billing.dto.AdminRefundRequestItem;
import com.devsync.billing.dto.AdminSubscriptionListItem;
import com.devsync.billing.dto.SubscriptionResponse;
import com.devsync.billing.entity.RefundRequest;
import com.devsync.common.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Admin billing management. Protected by /api/admin/** → ROLE_ADMIN in
 * SecurityConfig (never frontend-only). Cancellations are audit-logged.
 */
@RestController
@RequestMapping("/api/admin/billing")
@RequiredArgsConstructor
public class AdminBillingController {

    private final BillingService billingService;

    @GetMapping("/subscriptions")
    public ResponseEntity<PageResponse<AdminSubscriptionListItem>> subscriptions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String planCode,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(billingService.listSubscriptions(page, size, search, planCode, status));
    }

    @PostMapping("/subscriptions/{id}/cancel")
    public ResponseEntity<SubscriptionResponse> cancel(@PathVariable String id,
                                                       @AuthenticationPrincipal UserDetails admin) {
        return ResponseEntity.ok(billingService.adminCancelSubscription(id, admin.getUsername()));
    }

    @GetMapping("/stats")
    public ResponseEntity<AdminBillingStats> stats() {
        return ResponseEntity.ok(billingService.getAdminBillingStats());
    }

    // ── Refund requests ─────────────────────────────────────────

    @GetMapping("/refund-requests")
    public ResponseEntity<PageResponse<AdminRefundRequestItem>> refundRequests(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(billingService.listRefundRequests(page, size, status));
    }

    @PostMapping("/refund-requests/{id}/approve")
    public ResponseEntity<RefundRequest> approveRefundRequest(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails admin) {
        return ResponseEntity.ok(billingService.approveRefundRequest(
                id, admin.getUsername(), body.get("adminNote")));
    }

    @PostMapping("/refund-requests/{id}/reject")
    public ResponseEntity<RefundRequest> rejectRefundRequest(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails admin) {
        return ResponseEntity.ok(billingService.rejectRefundRequest(
                id, admin.getUsername(), body.get("adminNote")));
    }
}
