package com.devsync.github;

import com.devsync.activity.ActivityService;
import com.devsync.activity.entity.ActivityType;
import com.devsync.github.entity.ProjectGitHubLink;
import com.devsync.github.repository.ProjectGitHubLinkRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GitHubWebhookServiceTest {

    private static final String SECRET = "webhook-secret";

    @Mock private ProjectGitHubLinkRepository linkRepository;
    @Mock private ActivityService activityService;
    @Mock private com.devsync.kanban.repository.TaskRepository taskRepository;
    @Mock private com.devsync.kanban.repository.BoardRepository boardRepository;
    @Mock private com.devsync.github.repository.GitHubConnectionRepository connectionRepository;
    @Mock private com.devsync.kanban.BoardService boardService;

    private GitHubWebhookService service;

    @BeforeEach
    void setUp() {
        service = new GitHubWebhookService(linkRepository, activityService, taskRepository,
                boardRepository, connectionRepository, boardService);
        ReflectionTestUtils.setField(service, "webhookSecret", SECRET);
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

    // ── signature verification ───────────────────────────────

    @Test
    void verifySignature_shouldAccept_ValidSignature() {
        String payload = "{\"zen\":\"keep it simple\"}";
        assertThat(service.verifySignature(hmac(SECRET, payload), payload.getBytes(StandardCharsets.UTF_8))).isTrue();
    }

    @Test
    void verifySignature_shouldReject_WrongSignature() {
        String payload = "{\"zen\":\"keep it simple\"}";
        assertThat(service.verifySignature("sha256=deadbeef", payload.getBytes(StandardCharsets.UTF_8))).isFalse();
    }

    @Test
    void verifySignature_shouldReject_MissingHeader() {
        assertThat(service.verifySignature(null, "{}".getBytes(StandardCharsets.UTF_8))).isFalse();
    }

    @Test
    void verifySignature_shouldReject_NonSha256Prefix() {
        String payload = "{}";
        assertThat(service.verifySignature("md5=abc", payload.getBytes(StandardCharsets.UTF_8))).isFalse();
    }

    @Test
    void verifySignature_shouldReject_WhenSecretNotConfigured() {
        ReflectionTestUtils.setField(service, "webhookSecret", "");
        String payload = "{}";
        assertThat(service.verifySignature(hmac(SECRET, payload), payload.getBytes(StandardCharsets.UTF_8))).isFalse();
    }

    // ── idempotent processing ────────────────────────────────

    private String pushPayload(String repoFullName) {
        return "{\"ref\":\"refs/heads/main\",\"repository\":{\"full_name\":\"" + repoFullName
                + "\"},\"pusher\":{\"name\":\"octocat\"},\"sender\":{\"id\":123}}";
    }

    @Test
    void processEvent_shouldRecordActivity_ForLinkedRepo() {
        ProjectGitHubLink link = ProjectGitHubLink.builder().projectId("p1").repoFullName("o/r").build();
        when(linkRepository.findByRepoFullName("o/r")).thenReturn(Optional.of(link));

        service.processEvent("push", "delivery-1", pushPayload("o/r"));

        verify(activityService, times(1)).record(anyString(), eq("p1"), eq(ActivityType.PROJECT_UPDATED),
                anyString(), eq("o/r"), any());
    }

    @Test
    void processEvent_shouldBeIdempotent_ForSameDeliveryId() {
        ProjectGitHubLink link = ProjectGitHubLink.builder().projectId("p1").repoFullName("o/r").build();
        when(linkRepository.findByRepoFullName("o/r")).thenReturn(Optional.of(link));
        String payload = pushPayload("o/r");

        service.processEvent("push", "delivery-1", payload);
        service.processEvent("push", "delivery-1", payload); // GitHub retry

        verify(activityService, times(1)).record(anyString(), anyString(), any(), anyString(), anyString(), any());
    }

    @Test
    void processEvent_shouldIgnore_UnlinkedRepo() {
        when(linkRepository.findByRepoFullName("unknown/repo")).thenReturn(Optional.empty());

        service.processEvent("push", "delivery-2", pushPayload("unknown/repo"));

        verify(activityService, never()).record(anyString(), anyString(), any(), anyString(), anyString(), any());
    }

    @Test
    void processEvent_shouldIgnore_UnknownEventType() {
        service.processEvent("issues", "delivery-3", "{}");
        verify(activityService, never()).record(anyString(), anyString(), any(), anyString(), anyString(), any());
    }

    @Test
    void processEvent_shouldNotThrow_OnMalformedPayload() {
        service.processEvent("push", "delivery-4", "not-json{{{");
        verify(activityService, never()).record(anyString(), anyString(), any(), anyString(), anyString(), any());
    }

    // ── pull_request events (task ↔ PR sync) ────────────────

    private String pullRequestPayload(String repoFullName, String action, String headRef,
                                      long number, boolean merged) {
        return "{\"action\":\"" + action
                + "\",\"number\":" + number
                + ",\"repository\":{\"full_name\":\"" + repoFullName + "\"}"
                + ",\"pull_request\":{\"number\":" + number
                + ",\"html_url\":\"https://github.com/" + repoFullName + "/pull/" + number + "\""
                + ",\"state\":\"" + (merged ? "closed" : "open") + "\""
                + ",\"merged\":" + merged
                + ",\"merged_at\":" + (merged ? "\"2026-08-17T10:00:00Z\"" : "null")
                + ",\"created_at\":\"2026-08-17T09:00:00Z\""
                + ",\"user\":{\"login\":\"octocat\"}"
                + ",\"head\":{\"ref\":\"" + headRef + "\"}"
                + ",\"base\":{\"ref\":\"main\"}}}";
    }

    /**
     * The repo "o/r" is always linked to project "p1"; {@code boardProjectId}
     * is the project the branch's task actually belongs to (may differ, in
     * which case the event must be ignored).
     */
    private void stubTaskOnBranch(String branch, String taskId, String boardProjectId) {
        ProjectGitHubLink link = ProjectGitHubLink.builder().projectId("p1").repoFullName("o/r").build();
        when(linkRepository.findByRepoFullName("o/r")).thenReturn(Optional.of(link));
        com.devsync.kanban.entity.Task task = new com.devsync.kanban.entity.Task();
        task.setId(taskId);
        task.setBoardId("board-1");
        task.setBranchName(branch);
        when(taskRepository.findByBranchName(branch)).thenReturn(Optional.of(task));
        com.devsync.kanban.entity.Board board = new com.devsync.kanban.entity.Board();
        board.setId("board-1");
        board.setProjectId(boardProjectId);
        when(boardRepository.findById("board-1")).thenReturn(Optional.of(board));
    }

    @Test
    void pullRequestOpened_shouldSyncTaskState() {
        stubTaskOnBranch("feature/login-api", "task-1", "p1");

        service.processEvent("pull_request", "delivery-10",
                pullRequestPayload("o/r", "opened", "feature/login-api", 42, false));

        verify(boardService, times(1)).syncPullRequestFromEvent(eq("task-1"), argThat(e ->
                "opened".equals(e.action()) && e.number() == 42 && e.mergedAt() == null));
    }

    @Test
    void pullRequestOpened_shouldIgnore_WhenBranchNotMappedToTask() {
        ProjectGitHubLink link = ProjectGitHubLink.builder().projectId("p1").repoFullName("o/r").build();
        when(linkRepository.findByRepoFullName("o/r")).thenReturn(Optional.of(link));
        when(taskRepository.findByBranchName("feature/unknown")).thenReturn(Optional.empty());

        service.processEvent("pull_request", "delivery-11",
                pullRequestPayload("o/r", "opened", "feature/unknown", 7, false));

        verify(boardService, never()).syncPullRequestFromEvent(anyString(), any());
    }

    @Test
    void pullRequestOpened_shouldIgnore_WhenTaskBelongsToAnotherProject() {
        stubTaskOnBranch("feature/login-api", "task-1", "other-project");

        service.processEvent("pull_request", "delivery-12",
                pullRequestPayload("o/r", "opened", "feature/login-api", 42, false));

        verify(boardService, never()).syncPullRequestFromEvent(anyString(), any());
    }

    @Test
    void pullRequestMerged_shouldSyncMergedState() {
        stubTaskOnBranch("feature/login-api", "task-1", "p1");

        service.processEvent("pull_request", "delivery-13",
                pullRequestPayload("o/r", "closed", "feature/login-api", 42, true));

        verify(boardService, times(1)).syncPullRequestFromEvent(eq("task-1"), argThat(e ->
                "closed".equals(e.action()) && e.mergedAt() != null));
    }

    @Test
    void pullRequestReview_approved_shouldSyncTaskState() {
        stubTaskOnBranch("feature/login-api", "task-1", "p1");
        String payload = "{\"action\":\"submitted\",\"repository\":{\"full_name\":\"o/r\"}"
                + ",\"review\":{\"state\":\"approved\",\"user\":{\"login\":\"reviewer\"}}"
                + ",\"pull_request\":{\"number\":42,\"html_url\":\"https://github.com/o/r/pull/42\""
                + ",\"created_at\":\"2026-08-17T09:00:00Z\",\"merged_at\":null"
                + ",\"head\":{\"ref\":\"feature/login-api\"}}}";

        service.processEvent("pull_request_review", "delivery-14", payload);

        verify(boardService, times(1)).syncPullRequestFromEvent(eq("task-1"), argThat(e ->
                "review".equals(e.action()) && "APPROVED".equals(e.reviewState())));
    }
}
