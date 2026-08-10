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

    private GitHubWebhookService service;

    @BeforeEach
    void setUp() {
        service = new GitHubWebhookService(linkRepository, activityService);
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
}
