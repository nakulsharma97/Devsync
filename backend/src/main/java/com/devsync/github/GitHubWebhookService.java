package com.devsync.github;

import com.devsync.activity.ActivityService;
import com.devsync.activity.entity.ActivityType;
import com.devsync.github.entity.ProjectGitHubLink;
import com.devsync.github.repository.GitHubConnectionRepository;
import com.devsync.github.repository.ProjectGitHubLinkRepository;
import com.devsync.kanban.BoardService;
import com.devsync.kanban.entity.Board;
import com.devsync.kanban.entity.Task;
import com.devsync.kanban.repository.BoardRepository;
import com.devsync.kanban.repository.TaskRepository;
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
    private final TaskRepository taskRepository;
    private final BoardRepository boardRepository;
    private final GitHubConnectionRepository connectionRepository;
    private final BoardService boardService;
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
            } else if ("pull_request".equals(eventType)) {
                handlePullRequestEvent(body);
            } else if ("pull_request_review".equals(eventType)) {
                handlePullRequestReviewEvent(body);
            }
            // Other events (issues, ...) are acknowledged but not tracked.
        } catch (Exception e) {
            log.warn("Failed to process GitHub webhook delivery {}: {}", deliveryId, e.getMessage());
        }
    }

    /**
     * pull_request events: opened / synchronize / closed. Keeps the linked
     * DevSync task in sync with the real GitHub PR state — a merged PR
     * completes its task (the completion condition). Unknown actions are
     * ignored; branches that do not map to a task are skipped.
     */
    private void handlePullRequestEvent(JsonNode body) {
        ProjectGitHubLink link = linkForRepo(body);
        if (link == null) return;
        JsonNode pr = body.path("pull_request");
        String action = body.path("action").asText("");
        if (!"opened".equals(action) && !"synchronize".equals(action) && !"closed".equals(action)) {
            return;
        }
        String branch = pr.path("head").path("ref").asText(null);
        Task task = taskForBranch(branch, link);
        if (task == null) return;

        String authorId = userIdForGithubLogin(pr.path("user").path("login").asText(null));
        boardService.syncPullRequestFromEvent(task.getId(), new BoardService.PullRequestEvent(
                action, null, authorId,
                pr.path("number").asLong(),
                pr.path("html_url").asText(null),
                parseDate(pr.path("created_at").asText(null)),
                parseDate(pr.path("merged_at").asText(null))));
    }

    /**
     * pull_request_review events: submitted reviews with an APPROVED or
     * CHANGES_REQUESTED decision update the task's PR state and notify the
     * assignee.
     */
    private void handlePullRequestReviewEvent(JsonNode body) {
        ProjectGitHubLink link = linkForRepo(body);
        if (link == null) return;
        if (!"submitted".equals(body.path("action").asText(""))) return;
        JsonNode review = body.path("review");
        String reviewState = review.path("state").asText("");
        if (!"approved".equalsIgnoreCase(reviewState) && !"changes_requested".equalsIgnoreCase(reviewState)) {
            return;
        }
        JsonNode pr = body.path("pull_request");
        Task task = taskForBranch(pr.path("head").path("ref").asText(null), link);
        if (task == null) return;

        String reviewerId = userIdForGithubLogin(review.path("user").path("login").asText(null));
        boardService.syncPullRequestFromEvent(task.getId(), new BoardService.PullRequestEvent(
                "review", reviewState.toUpperCase(), reviewerId,
                pr.path("number").asLong(),
                pr.path("html_url").asText(null),
                parseDate(pr.path("created_at").asText(null)),
                parseDate(pr.path("merged_at").asText(null))));
    }

    /** The linked project for this repo, or null when the repo is not linked. */
    private ProjectGitHubLink linkForRepo(JsonNode body) {
        String repoFullName = body.path("repository").path("full_name").asText(null);
        if (repoFullName == null || repoFullName.isBlank()) return null;
        return linkRepository.findByRepoFullName(repoFullName).orElse(null);
    }

    /**
     * Maps a GitHub branch to the DevSync task working on it. The task must
     * belong to the linked project's board — a branch on a different project's
     * repo never touches that project's tasks.
     */
    private Task taskForBranch(String branch, ProjectGitHubLink link) {
        if (branch == null || branch.isBlank()) return null;
        Task task = taskRepository.findByBranchName(branch).orElse(null);
        if (task == null) return null;
        Board board = boardRepository.findById(task.getBoardId()).orElse(null);
        if (board == null || !link.getProjectId().equals(board.getProjectId())) return null;
        return task;
    }

    /** Maps a GitHub login to the DevSync user who connected that account. */
    private String userIdForGithubLogin(String githubLogin) {
        if (githubLogin == null || githubLogin.isBlank()) return null;
        return connectionRepository.findByGithubUsername(githubLogin)
                .map(c -> c.getUserId()).orElse(null);
    }

    private Instant parseDate(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Instant.parse(value);
        } catch (Exception e) {
            return null;
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
