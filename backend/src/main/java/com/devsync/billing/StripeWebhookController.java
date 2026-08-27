package com.devsync.billing;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Stripe webhook endpoint. Publicly reachable (permitAll in SecurityConfig)
 * but every request must carry a valid Stripe-Signature header — unsigned or
 * mismatched requests are rejected before any state change.
 */
@RestController
@RequestMapping("/api/billing/webhook")
@RequiredArgsConstructor
public class StripeWebhookController {

    private final BillingService billingService;

    @PostMapping("/stripe")
    public ResponseEntity<BillingService.WebhookAck> stripe(
            @RequestBody byte[] payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String signature) {
        return ResponseEntity.ok(billingService.handleStripeWebhook(payload, signature));
    }
}
