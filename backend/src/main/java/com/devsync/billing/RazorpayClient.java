package com.devsync.billing;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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

/**
 * Minimal Razorpay API client built on the JDK HttpClient — no extra
 * dependencies. Handles order creation (checkout) and webhook signature
 * verification. Card data never touches this application: Razorpay Checkout
 * collects it in their hosted flow; we only ever see payment references.
 */
@Component
@Slf4j
public class RazorpayClient {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Value("${app.billing.razorpay.key-id:}")
    private String keyId;

    @Value("${app.billing.razorpay.key-secret:}")
    private String keySecret;

    @Value("${app.billing.razorpay.webhook-secret:}")
    private String webhookSecret;

    @Value("${app.billing.razorpay.base-url:https://api.razorpay.com}")
    private String baseUrl;

    /** An order created at the provider, ready for the Checkout UI. */
    public record Order(String orderId, long amountPaise, String currency, String receipt) {}

    /** Payment reference fetched from the provider (webhook cross-check). */
    public record PaymentRef(String paymentId, String orderId, String status, long amountPaise, String currency) {}

    /** Refund created at Razorpay. */
    public record RefundResponse(String refundId, String paymentId, long amountPaise, String status) {}

    public boolean isConfigured() {
        return keyId != null && !keyId.isBlank()
                && keySecret != null && !keySecret.isBlank();
    }

    public String getKeyId() {
        return keyId;
    }

    /** POST /v1/orders — creates a pending order for the Checkout flow. */
    public Order createOrder(long amountPaise, String currency, String receipt) throws Exception {
        if (!isConfigured()) {
            throw new PaymentNotConfiguredException(
                    "Payment is not configured. Set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET.");
        }
        String body = objectMapper.writeValueAsString(java.util.Map.of(
                "amount", amountPaise,
                "currency", currency == null ? "INR" : currency,
                "receipt", receipt,
                "payment_capture", 1));
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/v1/orders"))
                .timeout(Duration.ofSeconds(15))
                .header("Content-Type", "application/json")
                .header("Authorization", basicAuth())
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400) {
            log.error("Razorpay createOrder failed: status={} body={}", response.statusCode(),
                    redact(response.body()));
            throw new IllegalStateException("Payment provider could not create the order");
        }
        JsonNode node = objectMapper.readTree(response.body());
        return new Order(
                node.path("id").asText(),
                node.path("amount").asLong(),
                node.path("currency").asText("INR"),
                node.path("receipt").asText());
    }

    /** GET /v1/payments/{id} — used to cross-check amount/currency on webhooks. */
    public PaymentRef fetchPayment(String paymentId) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/v1/payments/" + paymentId))
                .timeout(Duration.ofSeconds(15))
                .header("Authorization", basicAuth())
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400) {
            log.error("Razorpay fetchPayment failed: status={}", response.statusCode());
            throw new IllegalStateException("Payment provider could not fetch the payment");
        }
        JsonNode node = objectMapper.readTree(response.body());
        return new PaymentRef(
                node.path("id").asText(),
                node.path("order_id").asText(),
                node.path("status").asText(),
                node.path("amount").asLong(),
                node.path("currency").asText("INR"));
    }

    /**
     * Verifies the Razorpay webhook signature: HMAC-SHA256(webhookSecret,
     * rawPayload) hex-encoded, compared constant-time against the
     * X-Razorpay-Signature header. Unsigned or mismatched requests are rejected.
     */
    public boolean verifyWebhookSignature(byte[] payload, String signature) {
        if (payload == null || signature == null || signature.isBlank()
                || webhookSecret == null || webhookSecret.isBlank()) {
            return false;
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String expected = HexFormat.of().formatHex(mac.doFinal(payload));
            return constantTimeEquals(expected, signature.trim());
        } catch (Exception e) {
            log.warn("Webhook signature verification failed", e);
            return false;
        }
    }

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

    private String basicAuth() {
        return "Basic " + Base64.getEncoder().encodeToString(
                (keyId + ":" + keySecret).getBytes(StandardCharsets.UTF_8));
    }

    /**
     * POST /v1/payments/{paymentId}/refund — issues a full refund via Razorpay's
     * Refund API. The resulting refund.processed webhook will trigger entitlement
     * revocation in BillingService (single code path for all refunds).
     */
    public RefundResponse createRefund(String paymentId, String notes) throws Exception {
        if (!isConfigured()) {
            throw new PaymentNotConfiguredException(
                    "Payment is not configured. Set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET.");
        }
        java.util.Map<String, Object> bodyMap = new java.util.LinkedHashMap<>();
        bodyMap.put("payment_id", paymentId);
        bodyMap.put("amount", 0); // 0 = full refund in Razorpay API
        if (notes != null && !notes.isBlank()) {
            bodyMap.put("notes", java.util.Map.of("reason", notes));
        }
        String body = objectMapper.writeValueAsString(bodyMap);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/v1/payments/" + paymentId + "/refund"))
                .timeout(Duration.ofSeconds(15))
                .header("Content-Type", "application/json")
                .header("Authorization", basicAuth())
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400) {
            log.error("Razorpay createRefund failed for payment {}: status={} body={}",
                    paymentId, response.statusCode(), redact(response.body()));
            throw new IllegalStateException("Razorpay refund request failed: HTTP " + response.statusCode());
        }
        JsonNode node = objectMapper.readTree(response.body());
        return new RefundResponse(
                node.path("id").asText(),
                node.path("payment_id").asText(),
                node.path("amount").asLong(),
                node.path("status").asText());
    }

    /** Never echo full provider payloads into logs — keep only the status code. */
    private String redact(String body) {
        if (body == null) return "";
        return body.length() > 200 ? body.substring(0, 200) + "…" : body;
    }
}
