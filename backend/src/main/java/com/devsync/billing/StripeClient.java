package com.devsync.billing;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;

/**
 * Minimal Stripe API client built on the JDK HttpClient — no extra SDK
 * dependencies, mirroring {@link RazorpayClient}'s style. Handles Checkout
 * Session creation and webhook signature verification.
 */
@Component
@Slf4j
public class StripeClient {

    private static final long SIGNATURE_TOLERANCE_SECONDS = 300;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Value("${app.billing.stripe.secret-key:}")
    private String secretKey;

    @Value("${app.billing.stripe.publishable-key:}")
    private String publishableKey;

    @Value("${app.billing.stripe.webhook-secret:}")
    private String webhookSecret;

    @Value("${app.billing.stripe.success-url:http://localhost:5173/settings/billing?payment=success}")
    private String successUrl;

    @Value("${app.billing.stripe.cancel-url:http://localhost:5173/settings/billing?payment=cancelled}")
    private String cancelUrl;

    /** A Checkout Session created at Stripe, ready for frontend redirect. */
    public record CheckoutSession(String sessionId, String checkoutUrl) {}

    public boolean isConfigured() {
        return secretKey != null && !secretKey.isBlank();
    }

    public String getPublishableKey() {
        return publishableKey;
    }

    /**
     * POST /v1/checkout/sessions — creates a redirect-based Checkout Session
     * in one-time payment mode (mode=payment). Used for Razorpay-style
     * fixed-duration manual renewal flows.
     */
    public CheckoutSession createCheckoutSession(long amountPaise, String currency,
            String planCode, String userId) throws Exception {
        if (!isConfigured()) {
            throw new PaymentNotConfiguredException(
                    "Stripe payment is not configured. Set STRIPE_SECRET_KEY.");
        }

        String params = "mode=payment"
                + "&line_items[0][price_data][currency]=" + (currency == null ? "usd" : currency.toLowerCase())
                + "&line_items[0][price_data][product_data][name]=" + planCode + " plan"
                + "&line_items[0][price_data][unit_amount]=" + amountPaise
                + "&line_items[0][quantity]=1"
                + "&success_url=" + java.net.URLEncoder.encode(successUrl, StandardCharsets.UTF_8)
                + "&cancel_url=" + java.net.URLEncoder.encode(cancelUrl, StandardCharsets.UTF_8)
                + "&client_reference_id=" + userId
                + "&metadata[plan_code]=" + planCode
                + "&metadata[user_id]=" + userId;

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.stripe.com/v1/checkout/sessions"))
                .timeout(Duration.ofSeconds(15))
                .header("Authorization", "Bearer " + secretKey)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(params))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400) {
            log.error("Stripe createCheckoutSession failed: status={} body={}",
                    response.statusCode(), redact(response.body()));
            throw new IllegalStateException("Payment provider could not create the checkout session");
        }

        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        com.fasterxml.jackson.databind.JsonNode node = mapper.readTree(response.body());
        return new CheckoutSession(
                node.path("id").asText(),
                node.path("url").asText());
    }

    /**
     * POST /v1/products + POST /v1/prices — creates a Stripe Product and a
     * monthly recurring Price for the given plan. Returns the Price ID
     * (price_xxx) which can be reused for future checkouts.
     */
    public String createProductAndPrice(String planCode, long amountPaise, String currency) throws Exception {
        if (!isConfigured()) {
            throw new PaymentNotConfiguredException(
                    "Stripe payment is not configured. Set STRIPE_SECRET_KEY.");
        }

        String curr = (currency == null ? "inr" : currency.toLowerCase());
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();

        // 1. Create a Product
        String productParams = "name=" + java.net.URLEncoder.encode(planCode + " plan", StandardCharsets.UTF_8)
                + "&metadata[plan_code]=" + planCode;
        HttpRequest productReq = HttpRequest.newBuilder()
                .uri(URI.create("https://api.stripe.com/v1/products"))
                .timeout(Duration.ofSeconds(15))
                .header("Authorization", "Bearer " + secretKey)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(productParams))
                .build();
        HttpResponse<String> productResp = httpClient.send(productReq, HttpResponse.BodyHandlers.ofString());
        if (productResp.statusCode() >= 400) {
            log.error("Stripe createProduct failed: status={} body={}", productResp.statusCode(), redact(productResp.body()));
            throw new IllegalStateException("Failed to create Stripe product");
        }
        String productId = mapper.readTree(productResp.body()).path("id").asText();

        // 2. Create a monthly recurring Price for this Product
        String priceParams = "product=" + productId
                + "&currency=" + curr
                + "&unit_amount=" + amountPaise
                + "&recurring[interval]=month"
                + "&recurring[interval_count]=1"
                + "&metadata[plan_code]=" + planCode;
        HttpRequest priceReq = HttpRequest.newBuilder()
                .uri(URI.create("https://api.stripe.com/v1/prices"))
                .timeout(Duration.ofSeconds(15))
                .header("Authorization", "Bearer " + secretKey)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(priceParams))
                .build();
        HttpResponse<String> priceResp = httpClient.send(priceReq, HttpResponse.BodyHandlers.ofString());
        if (priceResp.statusCode() >= 400) {
            log.error("Stripe createPrice failed: status={} body={}", priceResp.statusCode(), redact(priceResp.body()));
            throw new IllegalStateException("Failed to create Stripe price");
        }
        String priceId = mapper.readTree(priceResp.body()).path("id").asText();
        log.info("Created Stripe product {} and price {} for plan {}", productId, priceId, planCode);
        return priceId;
    }

    /**
     * POST /v1/checkout/sessions — creates a redirect-based Checkout Session
     * in subscription mode (mode=subscription). Uses an existing Stripe Price ID
     * (from Plan.stripePriceId) for reliable subscription creation.
     */
    public CheckoutSession createSubscriptionCheckoutSession(String priceId,
            String planCode, String userId, String stripeCustomerId) throws Exception {
        if (!isConfigured()) {
            throw new PaymentNotConfiguredException(
                    "Stripe payment is not configured. Set STRIPE_SECRET_KEY.");
        }

        StringBuilder params = new StringBuilder();
        params.append("mode=subscription");
        params.append("&line_items[0][price]=").append(priceId);
        params.append("&line_items[0][quantity]=1");
        params.append("&success_url=").append(java.net.URLEncoder.encode(successUrl, StandardCharsets.UTF_8));
        params.append("&cancel_url=").append(java.net.URLEncoder.encode(cancelUrl, StandardCharsets.UTF_8));
        params.append("&client_reference_id=").append(userId);
        params.append("&metadata[plan_code]=").append(planCode);
        params.append("&metadata[user_id]=").append(userId);
        params.append("&subscription_data[metadata][plan_code]=").append(planCode);
        params.append("&subscription_data[metadata][user_id]=").append(userId);
        if (stripeCustomerId != null && !stripeCustomerId.isBlank()) {
            params.append("&customer=").append(stripeCustomerId);
        }

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.stripe.com/v1/checkout/sessions"))
                .timeout(Duration.ofSeconds(15))
                .header("Authorization", "Bearer " + secretKey)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(params.toString()))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400) {
            log.error("Stripe createSubscriptionCheckoutSession failed: status={} body={}",
                    response.statusCode(), redact(response.body()));
            throw new IllegalStateException("Payment provider could not create the subscription checkout session");
        }

        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        com.fasterxml.jackson.databind.JsonNode node = mapper.readTree(response.body());
        return new CheckoutSession(
                node.path("id").asText(),
                node.path("url").asText());
    }

    /**
     * POST /v1/customers — creates a Stripe Customer for subscription billing.
     * Returns the Stripe customer ID (cus_...).
     */
    public String createCustomer(String email, String name) throws Exception {
        if (!isConfigured()) {
            throw new PaymentNotConfiguredException(
                    "Stripe payment is not configured. Set STRIPE_SECRET_KEY.");
        }

        StringBuilder params = new StringBuilder();
        params.append("email=").append(java.net.URLEncoder.encode(email, StandardCharsets.UTF_8));
        if (name != null && !name.isBlank()) {
            params.append("&name=").append(java.net.URLEncoder.encode(name, StandardCharsets.UTF_8));
        }

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.stripe.com/v1/customers"))
                .timeout(Duration.ofSeconds(15))
                .header("Authorization", "Bearer " + secretKey)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(params.toString()))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400) {
            log.error("Stripe createCustomer failed: status={} body={}",
                    response.statusCode(), redact(response.body()));
            throw new IllegalStateException("Payment provider could not create customer");
        }

        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        com.fasterxml.jackson.databind.JsonNode node = mapper.readTree(response.body());
        return node.path("id").asText();
    }

    /**
     * PATCH /v1/subscriptions/{id} — schedules a Stripe subscription for
     * cancellation at the end of the current billing period. The subscription
     * remains active until {@code current_period_end}, then Stripe sends a
     * {@code customer.subscription.deleted} webhook to confirm the end.
     */
    public void cancelSubscription(String stripeSubscriptionId) throws Exception {
        if (!isConfigured()) {
            throw new PaymentNotConfiguredException(
                    "Stripe payment is not configured. Set STRIPE_SECRET_KEY.");
        }

        String params = "cancel_at_period_end=true";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.stripe.com/v1/subscriptions/" + stripeSubscriptionId))
                .timeout(Duration.ofSeconds(15))
                .header("Authorization", "Bearer " + secretKey)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .method("PATCH", HttpRequest.BodyPublishers.ofString(params))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400) {
            log.error("Stripe cancelSubscription failed: status={} body={}",
                    response.statusCode(), redact(response.body()));
            throw new IllegalStateException("Payment provider could not cancel subscription");
        }
        log.info("Stripe subscription {} scheduled for cancellation at period end", stripeSubscriptionId);
    }

    /**
     * DELETE /v1/subscriptions/{id} — immediately cancels a Stripe subscription.
     * Used for admin-initiated immediate cancellation or refund-triggered revocation.
     */
    public void cancelSubscriptionImmediately(String stripeSubscriptionId) throws Exception {
        if (!isConfigured()) {
            throw new PaymentNotConfiguredException(
                    "Stripe payment is not configured. Set STRIPE_SECRET_KEY.");
        }

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.stripe.com/v1/subscriptions/" + stripeSubscriptionId))
                .timeout(Duration.ofSeconds(15))
                .header("Authorization", "Bearer " + secretKey)
                .DELETE()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400) {
            log.error("Stripe cancelSubscriptionImmediately failed: status={} body={}",
                    response.statusCode(), redact(response.body()));
            throw new IllegalStateException("Payment provider could not cancel subscription");
        }
        log.info("Stripe subscription {} cancelled immediately", stripeSubscriptionId);
    }

    /**
     * Verifies the Stripe webhook signature. Stripe-Signature header format:
     * {@code t=<timestamp>,v1=<signature>}
     * <p>
     * Verification: HMAC-SHA256(webhookSecret, "${timestamp}.${rawBody}") must
     * match v1. The timestamp must be within {@link #SIGNATURE_TOLERANCE_SECONDS}
     * seconds of now (replay protection).
     */
    public boolean verifyWebhookSignature(byte[] payload, String stripeSignatureHeader) {
        if (payload == null || stripeSignatureHeader == null || stripeSignatureHeader.isBlank()
                || webhookSecret == null || webhookSecret.isBlank()) {
            return false;
        }

        try {
            String timestamp = extractStripeHeaderValue(stripeSignatureHeader, "t");
            String signature = extractStripeHeaderValue(stripeSignatureHeader, "v1");

            if (timestamp == null || signature == null) {
                log.warn("Stripe webhook signature header missing t or v1");
                return false;
            }

            // Replay protection: reject if timestamp is too old
            long sigTimestamp;
            try {
                sigTimestamp = Long.parseLong(timestamp);
            } catch (NumberFormatException e) {
                log.warn("Stripe webhook timestamp is not a valid integer: {}", timestamp);
                return false;
            }
            long now = System.currentTimeMillis() / 1000;
            if (Math.abs(now - sigTimestamp) > SIGNATURE_TOLERANCE_SECONDS) {
                log.warn("Stripe webhook timestamp outside tolerance: {} vs now {}", sigTimestamp, now);
                return false;
            }

            // Compute expected signature
            String signedPayload = timestamp + "." + new String(payload, StandardCharsets.UTF_8);
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String expected = HexFormat.of().formatHex(mac.doFinal(signedPayload.getBytes(StandardCharsets.UTF_8)));

            return constantTimeEquals(expected, signature);
        } catch (Exception e) {
            log.warn("Stripe webhook signature verification failed", e);
            return false;
        }
    }

    /**
     * Extracts a named value from Stripe's comma-separated header format.
     * e.g. from "t=123,v1=abc" with name "v1", returns "abc".
     */
    private String extractStripeHeaderValue(String header, String name) {
        for (String part : header.split(",")) {
            String[] kv = part.split("=", 2);
            if (kv.length == 2 && kv[0].trim().equals(name)) {
                return kv[1].trim();
            }
        }
        return null;
    }

    /** Stripe refund reason codes accepted by the API. */
    private static final java.util.Set<String> VALID_STRIPE_REFUND_REASONS =
            java.util.Set.of("duplicate", "fraudulent", "requested_by_customer");

    /**
     * POST /v1/refunds — creates a full refund via Stripe's Refund API.
     * The resulting charge.refunded webhook will trigger entitlement revocation
     * in BillingService (single code path for all refunds).
     *
     * @param paymentIntentId the Stripe payment intent to refund
     * @param reason          one of "duplicate", "fraudulent",
     *                        "requested_by_customer", or null/blank (omitted)
     */
    public RefundResponse createRefund(String paymentIntentId, String reason) throws Exception {
        if (!isConfigured()) {
            throw new PaymentNotConfiguredException(
                    "Stripe payment is not configured. Set STRIPE_SECRET_KEY.");
        }

        // Stripe only accepts three literal values for 'reason'.  Arbitrary free
        // text (e.g. an admin note) would cause a 400 from Stripe's API, so we
        // silently replace any non-whitelisted value with the safe default.
        String effectiveReason = (reason != null && !reason.isBlank()
                && VALID_STRIPE_REFUND_REASONS.contains(reason)) ? reason : "requested_by_customer";

        String params = "payment_intent=" + paymentIntentId
                + "&reason=" + java.net.URLEncoder.encode(effectiveReason, StandardCharsets.UTF_8);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.stripe.com/v1/refunds"))
                .timeout(Duration.ofSeconds(15))
                .header("Authorization", "Bearer " + secretKey)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(params))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400) {
            log.error("Stripe createRefund failed for payment_intent {}: status={} body={}",
                    paymentIntentId, response.statusCode(), redact(response.body()));
            throw new IllegalStateException("Stripe refund request failed: HTTP " + response.statusCode());
        }

        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        com.fasterxml.jackson.databind.JsonNode node = mapper.readTree(response.body());
        return new RefundResponse(
                node.path("id").asText(),
                node.path("payment_intent").asText(),
                node.path("amount").asLong(),
                node.path("status").asText());
    }

    /** Stripe refund response. */
    public record RefundResponse(String refundId, String paymentIntentId, long amountPaise, String status) {}

    private boolean constantTimeEquals(String a, String b) {
        byte[] ba = a.getBytes(StandardCharsets.UTF_8);
        byte[] bb = b.getBytes(StandardCharsets.UTF_8);
        if (ba.length != bb.length) return false;
        int diff = 0;
        for (int i = 0; i < ba.length; i++) {
            diff |= ba[i] ^ bb[i];
        }
        return diff == 0;
    }

    private String redact(String body) {
        if (body == null) return "";
        return body.length() > 200 ? body.substring(0, 200) + "…" : body;
    }
}
