package com.devsync.github;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class GitHubWebhookControllerTest {

    @Mock private GitHubWebhookService webhookService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new GitHubWebhookController(webhookService)).build();
    }

    @Test
    void webhook_shouldReject_WhenSignatureInvalid() throws Exception {
        when(webhookService.verifySignature(anyString(), any())).thenReturn(false);
        mockMvc.perform(post("/api/webhooks/github")
                        .header("X-Hub-Signature-256", "sha256=bad")
                        .header("X-GitHub-Event", "push")
                        .content("{\"ref\":\"refs/heads/main\"}")
                        .contentType("application/json"))
                .andExpect(status().isUnauthorized());
        verify(webhookService, never()).processEvent(anyString(), anyString(), anyString());
    }

    @Test
    void webhook_shouldReject_MissingSignature() throws Exception {
        mockMvc.perform(post("/api/webhooks/github")
                        .content("{}")
                        .contentType("application/json"))
                .andExpect(status().isUnauthorized());
        verify(webhookService, never()).processEvent(anyString(), anyString(), anyString());
    }

    @Test
    void webhook_shouldProcess_WhenSignatureValid() throws Exception {
        when(webhookService.verifySignature(anyString(), any())).thenReturn(true);
        mockMvc.perform(post("/api/webhooks/github")
                        .header("X-Hub-Signature-256", "sha256=valid")
                        .header("X-GitHub-Event", "push")
                        .header("X-GitHub-Delivery", "delivery-1")
                        .content("{\"ref\":\"refs/heads/main\"}")
                        .contentType("application/json"))
                .andExpect(status().isOk());
        verify(webhookService).processEvent("push", "delivery-1", "{\"ref\":\"refs/heads/main\"}");
    }

    @Test
    void webhook_shouldReject_EmptyBody() throws Exception {
        mockMvc.perform(post("/api/webhooks/github")
                        .contentType("application/json"))
                .andExpect(status().isBadRequest());
    }

    private static String hmac(String secret, String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            StringBuilder sb = new StringBuilder();
            for (byte b : mac.doFinal(payload.getBytes(StandardCharsets.UTF_8))) {
                sb.append(String.format("%02x", b));
            }
            return "sha256=" + sb;
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
