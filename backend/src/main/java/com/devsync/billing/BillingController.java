package com.devsync.billing;

import com.devsync.billing.dto.*;
import com.devsync.billing.entity.RefundRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * User-facing billing endpoints. Every endpoint resolves the user from the
 * authenticated token — a caller can never read or mutate another user's
 * billing state.
 */
@RestController
@RequestMapping("/api/billing")
@RequiredArgsConstructor
public class BillingController {

    private final BillingService billingService;

    @PostMapping("/checkout")
    public ResponseEntity<CheckoutResponse> checkout(@Valid @RequestBody CheckoutRequest request,
                                                     @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(billingService.createCheckout(userDetails.getUsername(),
                request.getPlanCode(), request.getProvider()));
    }

    @GetMapping("/subscription")
    public ResponseEntity<SubscriptionResponse> subscription(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(billingService.getSubscription(userDetails.getUsername()));
    }

    @GetMapping("/payments")
    public ResponseEntity<List<PaymentResponse>> payments(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(billingService.getPayments(userDetails.getUsername()));
    }

    @GetMapping("/usage")
    public ResponseEntity<UsageResponse> usage(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(billingService.getUsage(userDetails.getUsername()));
    }

    @PostMapping("/cancel")
    public ResponseEntity<SubscriptionResponse> cancel(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(billingService.cancelSubscription(userDetails.getUsername()));
    }

    // ── Self-serve refund requests ────────────────────────────────

    @PostMapping("/refund-requests")
    public ResponseEntity<RefundRequest> submitRefundRequest(
            @RequestBody RefundRequestDto request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(billingService.submitRefundRequest(
                userDetails.getUsername(), request.getPaymentId(), request.getReason()));
    }

    @GetMapping("/refund-requests")
    public ResponseEntity<List<RefundRequest>> myRefundRequests(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(billingService.getMyRefundRequests(userDetails.getUsername()));
    }
}
