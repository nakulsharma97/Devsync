package com.devsync.github;

import com.devsync.activity.ActivityService;
import com.devsync.activity.entity.ActivityType;
import com.devsync.github.entity.ProjectGitHubLink;
import com.devsync.github.repository.ProjectGitHubLinkRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Receives GitHub webhooks. Every request must carry a valid
 * {@code X-Hub-Signature-256} HMAC; unsigned or mismatched payloads are rejected.
 * Events are deduplicated by delivery id so retries are harmless.
 */
@Service
@RequiredArgsConstructor
public class GitHubWebhookService {

    private static final Logger log = LoggerFactory.getLogger(GitHubWebhookService.class);
    private static final long DELIVERY_TTL_SECONDS = 300;

    private final ProjectGitHubLinkRepository linkRepository;
    private final ActivityService activityService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.github.webhook-secret:}")
    private String webhookSecret;

    private final Map<String, Instant> processedDeliveries = new ConcurrentHashMap<>();

    /** Returns true when the signature matches the payload. */
    public boolean verifySignature(String signatureHeader, byte[] payload) {
        if (webhookSecret == null || webhookSecret.isBlank()) {
            log.warn("GitHub webhook received but GITHUB_WEBHOOK_SECRET is not configured — rejecting");
            return false;
        }
        if (signatureHeader == null || !signatureHeader.startsWith("sha256=")) {
            return false;
        }
        String expected = hmacSha256(webhookSecret, payload);
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                signatureHeader.substring("sha256=".length()).getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Processes a verified webhook event. Unknown event types are acknowledged
     * (200) so GitHub stops retrying; unlinked repos are logged and ignored.
     */
    public void processEvent(String eventType, String deliveryId, String payload) {
        if (deliveryId == null || deliveryId.isBlank() || isDuplicate(deliveryId)) {
            return; // idempotent: retries of the same delivery are dropped
        }
        try {
            JsonNode body = objectMapper.readTree(payload);
            if ("push".equals(eventType)) {
                handlePush(body);
            }
            // Other events (issues, pull_request, ...) are acknowledged but not
            // tracked — push is the only event DevSync consumes today.
        } catch (Exception e) {
            log.warn("Failed to process GitHub webhook delivery {}: {}", deliveryId, e.getMessage());
        }
    }

    private void handlePush(JsonNode body) {
        String repoFullName = body.path("repository").path("full_name").asText(null);
        if (repoFullName == null || repoFullName.isBlank()) return;
        linkRepository.findByRepoFullName(repoFullName).ifPresent(link -> {
            String pusher = body.path("pusher").path("name").asText("unknown");
            String branch = body.path("ref").asText("").replace("refs/heads/", "");
            activityService.record(
                    body.path("sender").path("id").asText("github"),
                    link.getProjectId(),
                    ActivityType.PROJECT_UPDATED,
                    "GitHub push to " + repoFullName + " (" + branch + ") by " + pusher,
                    repoFullName,
                    null);
        });
    }

    private boolean isDuplicate(String deliveryId) {
        Instant existing = processedDeliveries.get(deliveryId);
        if (existing != null && existing.isAfter(Instant.now())) {
            return true;
        }
        processedDeliveries.put(deliveryId, Instant.now().plusSeconds(DELIVERY_TTL_SECONDS));
        // Bounded: drop entries older than the TTL window occasionally.
        if (processedDeliveries.size() > 10_000) {
            processedDeliveries.entrySet().removeIf(e -> e.getValue().isBefore(Instant.now()));
        }
        return false;
    }

    private String hmacSha256(String secret, byte[] payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(payload);
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("HMAC-SHA256 unavailable", e);
        }
    }
}
