package com.devsync.billing;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link StripeClient} webhook signature verification.
 * Mirrors {@link RazorpayClientTest} but adapted for Stripe's
 * {@code t=<timestamp>,v1=<signature>} header format and 300-second
 * replay protection tolerance.
 */
class StripeClientTest {

    private static final String WEBHOOK_SECRET = "whsec_test_secret";
    private static final long SIGNATURE_TOLERANCE_SECONDS = 300;

    private StripeClient client;

    @BeforeEach
    void setUp() {
        client = new StripeClient();
        ReflectionTestUtils.setField(client, "webhookSecret", WEBHOOK_SECRET);
    }

    // ── Helpers ─────────────────────────────────────────────────

    /**
     * Builds a Stripe-Signature header the same way Stripe does:
     * computes HMAC-SHA256(webhookSecret, "{timestamp}.{payload}") and
     * formats it as {@code t=<timestamp>,v1=<hex_signature>}.
     */
    private String buildStripeSignatureHeader(byte[] payload, long timestamp) throws Exception {
        String signedPayload = timestamp + "." + new String(payload, StandardCharsets.UTF_8);
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(WEBHOOK_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String v1 = HexFormat.of().formatHex(
                mac.doFinal(signedPayload.getBytes(StandardCharsets.UTF_8)));
        return "t=" + timestamp + ",v1=" + v1;
    }

    /** Returns current Unix timestamp in seconds. */
    private long nowSeconds() {
        return System.currentTimeMillis() / 1000;
    }

    // ── Valid signature ─────────────────────────────────────────

    @Test
    void verifyWebhookSignature_shouldAccept_validSignature() throws Exception {
        byte[] payload = "{\"id\":\"evt_1\",\"type\":\"checkout.session.completed\"}"
                .getBytes(StandardCharsets.UTF_8);
        long ts = nowSeconds();
        String header = buildStripeSignatureHeader(payload, ts);

        assertThat(client.verifyWebhookSignature(payload, header)).isTrue();
    }

    @Test
    void verifyWebhookSignature_shouldAccept_payloadWithSpecialChars() throws Exception {
        byte[] payload = "{\"data\":{\"object\":{\"amount_total\":29900,\"currency\":\"inr\"}}}"
                .getBytes(StandardCharsets.UTF_8);
        long ts = nowSeconds();
        String header = buildStripeSignatureHeader(payload, ts);

        assertThat(client.verifyWebhookSignature(payload, header)).isTrue();
    }

    // ── Mismatched / tampered signature ─────────────────────────

    @Test
    void verifyWebhookSignature_shouldReject_tamperedPayload() throws Exception {
        byte[] payload = "{\"id\":\"evt_1\",\"type\":\"checkout.session.completed\"}"
                .getBytes(StandardCharsets.UTF_8);
        long ts = nowSeconds();
        String header = buildStripeSignatureHeader(payload, ts);

        // Tamper with the payload after signing
        byte[] tampered = "{\"id\":\"evt_1\",\"type\":\"invoice.paid\"}"
                .getBytes(StandardCharsets.UTF_8);
        assertThat(client.verifyWebhookSignature(tampered, header)).isFalse();
    }

    @Test
    void verifyWebhookSignature_shouldReject_mismatchedV1() throws Exception {
        byte[] payload = "{\"id\":\"evt_1\"}".getBytes(StandardCharsets.UTF_8);
        long ts = nowSeconds();
        // Use a bogus v1 signature
        String header = "t=" + ts + ",v1=deadbeef00000000000000000000000000000000000000000000000000000000";

        assertThat(client.verifyWebhookSignature(payload, header)).isFalse();
    }

    @Test
    void verifyWebhookSignature_shouldReject_completelyWrongSignature() throws Exception {
        byte[] payload = "{\"id\":\"evt_1\"}".getBytes(StandardCharsets.UTF_8);
        long ts = nowSeconds();
        String header = "t=" + ts + ",v1=" + "a".repeat(64);

        assertThat(client.verifyWebhookSignature(payload, header)).isFalse();
    }

    // ── Null / blank / missing inputs ───────────────────────────

    @Test
    void verifyWebhookSignature_shouldReject_nullPayload() throws Exception {
        long ts = nowSeconds();
        String header = "t=" + ts + ",v1=abc";
        assertThat(client.verifyWebhookSignature(null, header)).isFalse();
    }

    @Test
    void verifyWebhookSignature_shouldReject_nullHeader() {
        byte[] payload = "{}".getBytes(StandardCharsets.UTF_8);
        assertThat(client.verifyWebhookSignature(payload, null)).isFalse();
    }

    @Test
    void verifyWebhookSignature_shouldReject_blankHeader() {
        byte[] payload = "{}".getBytes(StandardCharsets.UTF_8);
        assertThat(client.verifyWebhookSignature(payload, "")).isFalse();
        assertThat(client.verifyWebhookSignature(payload, "   ")).isFalse();
    }

    @Test
    void verifyWebhookSignature_shouldReject_whenSecretNotConfigured() throws Exception {
        StripeClient unconfigured = new StripeClient();
        byte[] payload = "{\"id\":\"evt_1\"}".getBytes(StandardCharsets.UTF_8);
        long ts = nowSeconds();

        // Build a valid header using the test secret, but the unconfigured client
        // has no secret — should reject.
        String header = buildStripeSignatureHeader(payload, ts);
        assertThat(unconfigured.verifyWebhookSignature(payload, header)).isFalse();
    }

    @Test
    void verifyWebhookSignature_shouldReject_whenSecretIsBlank() throws Exception {
        StripeClient blankSecret = new StripeClient();
        ReflectionTestUtils.setField(blankSecret, "webhookSecret", "");
        byte[] payload = "{}".getBytes(StandardCharsets.UTF_8);
        assertThat(blankSecret.verifyWebhookSignature(payload, "t=1,v1=abc")).isFalse();
    }

    // ── Timestamp / replay protection ───────────────────────────

    @Test
    void verifyWebhookSignature_shouldReject_timestampTooOld() throws Exception {
        byte[] payload = "{\"id\":\"evt_1\"}".getBytes(StandardCharsets.UTF_8);
        long oldTimestamp = nowSeconds() - SIGNATURE_TOLERANCE_SECONDS - 60;
        String header = buildStripeSignatureHeader(payload, oldTimestamp);

        assertThat(client.verifyWebhookSignature(payload, header)).isFalse();
    }

    @Test
    void verifyWebhookSignature_shouldReject_timestampTooFarInFuture() throws Exception {
        byte[] payload = "{\"id\":\"evt_1\"}".getBytes(StandardCharsets.UTF_8);
        long futureTimestamp = nowSeconds() + SIGNATURE_TOLERANCE_SECONDS + 60;
        String header = buildStripeSignatureHeader(payload, futureTimestamp);

        assertThat(client.verifyWebhookSignature(payload, header)).isFalse();
    }

    @Test
    void verifyWebhookSignature_shouldAccept_timestampAtToleranceBoundary() throws Exception {
        byte[] payload = "{\"id\":\"evt_1\"}".getBytes(StandardCharsets.UTF_8);
        // Exactly at the tolerance boundary — should still be accepted
        long ts = nowSeconds() + SIGNATURE_TOLERANCE_SECONDS;
        String header = buildStripeSignatureHeader(payload, ts);

        assertThat(client.verifyWebhookSignature(payload, header)).isTrue();
    }

    @Test
    void verifyWebhookSignature_shouldReject_nonNumericTimestamp() {
        byte[] payload = "{}".getBytes(StandardCharsets.UTF_8);
        String header = "t=not-a-number,v1=abcdef";
        assertThat(client.verifyWebhookSignature(payload, header)).isFalse();
    }

    // ── Malformed header parsing ────────────────────────────────

    @Test
    void verifyWebhookSignature_shouldReject_missingTimestamp() {
        byte[] payload = "{}".getBytes(StandardCharsets.UTF_8);
        // Only v1 present, no t=
        String header = "v1=abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
        assertThat(client.verifyWebhookSignature(payload, header)).isFalse();
    }

    @Test
    void verifyWebhookSignature_shouldReject_missingV1() {
        byte[] payload = "{}".getBytes(StandardCharsets.UTF_8);
        long ts = nowSeconds();
        // Only t= present, no v1=
        String header = "t=" + ts;
        assertThat(client.verifyWebhookSignature(payload, header)).isFalse();
    }

    @Test
    void verifyWebhookSignature_shouldReject_emptyParts() {
        byte[] payload = "{}".getBytes(StandardCharsets.UTF_8);
        assertThat(client.verifyWebhookSignature(payload, "t=,v1=")).isFalse();
    }

    @Test
    void verifyWebhookSignature_shouldReject_completelyMalformedHeader() {
        byte[] payload = "{}".getBytes(StandardCharsets.UTF_8);
        assertThat(client.verifyWebhookSignature(payload, "garbage")).isFalse();
        assertThat(client.verifyWebhookSignature(payload, "t=v1=")).isFalse();
    }

    // ── Multiple v1 signatures (Stripe can send) ────────────────

    @Test
    void verifyWebhookSignature_shouldAccept_headerWithMultipleV1() throws Exception {
        // Stripe can include multiple v1 signatures (e.g., after key rotation).
        // The implementation should match any one of them.
        byte[] payload = "{\"id\":\"evt_1\"}".getBytes(StandardCharsets.UTF_8);
        long ts = nowSeconds();
        String signedPayload = ts + "." + new String(payload, StandardCharsets.UTF_8);
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(WEBHOOK_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String v1First = HexFormat.of().formatHex(
                mac.doFinal(signedPayload.getBytes(StandardCharsets.UTF_8)));

        // Compute a second v1 with a different (old) secret — won't match,
        // but the first one will.
        String header = "t=" + ts + ",v1=" + v1First + ",v1=0000000000000000000000000000000000000000000000000000000000000000";

        assertThat(client.verifyWebhookSignature(payload, header)).isTrue();
    }

    @Test
    void verifyWebhookSignature_shouldReject_headerWithOnlyWrongV1s() {
        byte[] payload = "{\"id\":\"evt_1\"}".getBytes(StandardCharsets.UTF_8);
        long ts = nowSeconds();
        String header = "t=" + ts
                + ",v1=0000000000000000000000000000000000000000000000000000000000000000"
                + ",v1=1111111111111111111111111111111111111111111111111111111111111111";

        assertThat(client.verifyWebhookSignature(payload, header)).isFalse();
    }

    // ── isConfigured ────────────────────────────────────────────

    @Test
    void isConfigured_shouldReturnFalse_whenSecretKeyBlank() {
        assertThat(client.isConfigured()).isFalse();
    }

    @Test
    void isConfigured_shouldReturnTrue_whenSecretKeySet() {
        ReflectionTestUtils.setField(client, "secretKey", "sk_test_key");
        assertThat(client.isConfigured()).isTrue();
    }

    @Test
    void isConfigured_shouldReturnFalse_whenSecretKeyNull() {
        ReflectionTestUtils.setField(client, "secretKey", null);
        assertThat(client.isConfigured()).isFalse();
    }

    // ── getPublishableKey ───────────────────────────────────────

    @Test
    void getPublishableKey_shouldReturnConfiguredValue() {
        ReflectionTestUtils.setField(client, "publishableKey", "pk_test_key");
        assertThat(client.getPublishableKey()).isEqualTo("pk_test_key");
    }
}
