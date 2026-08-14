package com.devsync.billing;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Provider webhook endpoint. Publicly reachable (permitAll in SecurityConfig)
 * but every request must carry a valid X-Razorpay-Signature — unsigned or
 * mismatched requests are rejected before any state change.
 */
@RestController
@RequestMapping("/api/billing/webhook")
@RequiredArgsConstructor
public class BillingWebhookController {

    private final BillingService billingService;

    @PostMapping("/razorpay")
    public ResponseEntity<BillingService.WebhookAck> razorpay(
            @RequestBody byte[] payload,
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature) {
        return ResponseEntity.ok(billingService.handleRazorpayWebhook(payload, signature));
    }
}
