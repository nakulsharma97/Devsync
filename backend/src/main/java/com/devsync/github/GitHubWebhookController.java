package com.devsync.github;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Receives GitHub webhook deliveries. The signature (X-Hub-Signature-256) is
 * verified against the payload before anything is processed; unsigned or
 * mismatched requests are rejected with 401.
 */
@RestController
@RequestMapping("/api/webhooks")
@RequiredArgsConstructor
public class GitHubWebhookController {

    private final GitHubWebhookService webhookService;

    @PostMapping("/github")
    public ResponseEntity<Void> webhook(
            @RequestHeader(value = "X-Hub-Signature-256", required = false) String signature,
            @RequestHeader(value = "X-GitHub-Event", required = false) String eventType,
            @RequestHeader(value = "X-GitHub-Delivery", required = false) String deliveryId,
            @RequestBody(required = false) byte[] body) throws IOException {
        if (body == null || body.length == 0) {
            return ResponseEntity.badRequest().build();
        }
        if (!webhookService.verifySignature(signature, body)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        webhookService.processEvent(eventType, deliveryId, new String(body, StandardCharsets.UTF_8));
        return ResponseEntity.ok().build();
    }
}
