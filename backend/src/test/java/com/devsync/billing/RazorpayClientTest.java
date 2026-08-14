package com.devsync.billing;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

import static org.assertj.core.api.Assertions.assertThat;

class RazorpayClientTest {

    private RazorpayClient client;

    @BeforeEach
    void setUp() {
        client = new RazorpayClient();
        ReflectionTestUtils.setField(client, "webhookSecret", "test-webhook-secret");
    }

    private String sign(byte[] payload) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec("test-webhook-secret".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(payload));
    }

    @Test
    void verifyWebhookSignature_shouldAccept_validSignature() throws Exception {
        byte[] payload = "{\"event\":\"payment.captured\",\"event_id\":\"evt_1\"}".getBytes(StandardCharsets.UTF_8);
        assertThat(client.verifyWebhookSignature(payload, sign(payload))).isTrue();
    }

    @Test
    void verifyWebhookSignature_shouldReject_mismatchedSignature() throws Exception {
        byte[] payload = "{\"event\":\"payment.captured\",\"event_id\":\"evt_1\"}".getBytes(StandardCharsets.UTF_8);
        assertThat(client.verifyWebhookSignature(payload, "deadbeef")).isFalse();
    }

    @Test
    void verifyWebhookSignature_shouldReject_missingSignature() {
        byte[] payload = "{}".getBytes(StandardCharsets.UTF_8);
        assertThat(client.verifyWebhookSignature(payload, null)).isFalse();
        assertThat(client.verifyWebhookSignature(payload, "")).isFalse();
        assertThat(client.verifyWebhookSignature(null, "abc")).isFalse();
    }

    @Test
    void verifyWebhookSignature_shouldReject_whenSecretNotConfigured() throws Exception {
        RazorpayClient unconfigured = new RazorpayClient();
        byte[] payload = "{}".getBytes(StandardCharsets.UTF_8);
        assertThat(unconfigured.verifyWebhookSignature(payload, sign(payload))).isFalse();
    }

    @Test
    void isConfigured_shouldReflectCredentials() {
        assertThat(client.isConfigured()).isFalse();
        ReflectionTestUtils.setField(client, "keyId", "rzp_test_key");
        ReflectionTestUtils.setField(client, "keySecret", "rzp_test_secret");
        assertThat(client.isConfigured()).isTrue();
    }
}
