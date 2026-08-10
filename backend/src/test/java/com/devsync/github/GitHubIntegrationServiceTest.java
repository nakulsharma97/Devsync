package com.devsync.github;

import com.devsync.audit.AuditLogService;
import com.devsync.audit.entity.AuditAction;
import com.devsync.audit.entity.AuditStatus;
import com.devsync.github.dto.GitHubRepoDto;
import com.devsync.github.entity.GitHubConnection;
import com.devsync.github.repository.GitHubConnectionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GitHubIntegrationServiceTest {

    @Mock private GitHubConnectionRepository connectionRepository;
    @Mock private GitHubClient githubClient;
    @Mock private GitHubOAuthClient oauthClient;
    @Mock private AuditLogService auditLogService;

    private GitHubTokenCrypto crypto;
    private GitHubIntegrationService service;

    @BeforeEach
    void setUp() {
        crypto = new GitHubTokenCrypto("test-key-material", "unused");
        service = new GitHubIntegrationService(connectionRepository, crypto, githubClient, oauthClient, auditLogService);
        ReflectionTestUtils.setField(service, "clientId", "client-id");
        ReflectionTestUtils.setField(service, "clientSecret", "client-secret");
        ReflectionTestUtils.setField(service, "redirectUri", "http://localhost:8080/api/github/callback");
        ReflectionTestUtils.setField(service, "frontendUrl", "http://localhost:5173");
    }

    @Test
    void createAuthUrl_shouldReturnGitHubAuthorizeUrlWithState() {
        var response = service.createAuthUrl("user-1");
        assertThat(response.getUrl()).startsWith("https://github.com/login/oauth/authorize?");
        assertThat(response.getUrl()).contains("client_id=client-id");
        assertThat(response.getUrl()).contains("scope=repo");
        assertThat(response.getUrl()).contains("state=");
    }

    @Test
    void createAuthUrl_shouldFail_WhenNotConfigured() {
        ReflectionTestUtils.setField(service, "clientId", "");
        assertThatThrownBy(() -> service.createAuthUrl("u"))
                .isInstanceOf(GitHubException.class);
    }

    @Test
    void handleCallback_shouldConnectAndStoreEncryptedToken() {
        String state = extractState(service.createAuthUrl("user-1").getUrl());
        when(oauthClient.exchangeCode(eq("code-123"), anyString(), anyString(), anyString()))
                .thenReturn(new GitHubOAuthClient.TokenExchange("gho_access_token", "repo,read:user"));
        when(githubClient.fetchUsername("gho_access_token")).thenReturn("octocat");
        when(connectionRepository.findByUserId("user-1")).thenReturn(Optional.empty());
        when(connectionRepository.save(any(GitHubConnection.class))).thenAnswer(inv -> inv.getArgument(0));

        String result = service.handleCallback("code-123", state);

        assertThat(result).contains("connected");
        ArgumentCaptor<GitHubConnection> captor = ArgumentCaptor.forClass(GitHubConnection.class);
        verify(connectionRepository).save(captor.capture());
        GitHubConnection saved = captor.getValue();
        assertThat(saved.getGithubUsername()).isEqualTo("octocat");
        // Token must be encrypted at rest — never the raw value.
        assertThat(saved.getEncryptedAccessToken()).isNotEqualTo("gho_access_token");
        assertThat(saved.getEncryptedAccessToken()).doesNotContain("gho_access_token");
        assertThat(crypto.decrypt(saved.getEncryptedAccessToken())).isEqualTo("gho_access_token");
        verify(auditLogService).record(eq("user-1"), eq("user-1"),
                eq(AuditAction.GITHUB_CONNECTED), eq(AuditStatus.SUCCESS), anyString());
    }

    @Test
    void handleCallback_shouldReconnect_ReplacingExistingConnection() {
        String state = extractState(service.createAuthUrl("user-1").getUrl());
        when(oauthClient.exchangeCode(anyString(), anyString(), anyString(), anyString()))
                .thenReturn(new GitHubOAuthClient.TokenExchange("new_token", "repo"));
        when(githubClient.fetchUsername("new_token")).thenReturn("octocat2");
        GitHubConnection existing = GitHubConnection.builder()
                .userId("user-1").githubUsername("old").encryptedAccessToken("old-cipher").build();
        when(connectionRepository.findByUserId("user-1")).thenReturn(Optional.of(existing));
        when(connectionRepository.save(any(GitHubConnection.class))).thenAnswer(inv -> inv.getArgument(0));

        service.handleCallback("code", state);

        ArgumentCaptor<GitHubConnection> captor = ArgumentCaptor.forClass(GitHubConnection.class);
        verify(connectionRepository).save(captor.capture());
        assertThat(captor.getValue().getGithubUsername()).isEqualTo("octocat2");
        assertThat(crypto.decrypt(captor.getValue().getEncryptedAccessToken())).isEqualTo("new_token");
        assertThat(captor.getValue().getEncryptedAccessToken()).isNotEqualTo("old-cipher");
    }

    @Test
    void handleCallback_shouldReject_UnknownState() {
        String result = service.handleCallback("code", "forged-state");
        assertThat(result).contains("error=invalid_state");
        verify(connectionRepository, never()).save(any());
    }

    @Test
    void handleCallback_shouldReject_ReusedState() {
        String state = extractState(service.createAuthUrl("user-1").getUrl());
        service.handleCallback("code", state); // consumed
        String second = service.handleCallback("code", state); // replay attack
        assertThat(second).contains("error=invalid_state");
        verify(connectionRepository, never()).save(any());
    }

    @Test
    void disconnect_shouldDeleteAndAudit() {
        service.disconnect("user-1");
        verify(connectionRepository).deleteByUserId("user-1");
        verify(auditLogService).record(eq("user-1"), eq("user-1"),
                eq(AuditAction.GITHUB_DISCONNECTED), eq(AuditStatus.SUCCESS), anyString());
    }

    @Test
    void listRepos_shouldDecryptTokenAndCache() {
        GitHubConnection connection = GitHubConnection.builder()
                .userId("user-1")
                .githubUsername("octocat")
                .encryptedAccessToken(crypto.encrypt("gho_secret"))
                .connectedAt(Instant.now())
                .build();
        when(connectionRepository.findByUserId("user-1")).thenReturn(Optional.of(connection));

        List<GitHubRepoDto> repos = List.of(GitHubRepoDto.builder().fullName("o/r").build());
        when(githubClient.fetchRepos("gho_secret")).thenReturn(repos);

        assertThat(service.listRepos("user-1")).isSameAs(repos);
        // Second call is served from the TTL cache — no second GitHub call.
        assertThat(service.listRepos("user-1")).isSameAs(repos);
        verify(githubClient, times(1)).fetchRepos(anyString());
    }

    @Test
    void listRepos_shouldThrowAuthRequired_WhenNotConnected() {
        when(connectionRepository.findByUserId("user-1")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.listRepos("user-1"))
                .isInstanceOf(GitHubException.AuthRequired.class);
    }

    @Test
    void tokenFor_shouldReturnDecryptedToken() {
        GitHubConnection connection = GitHubConnection.builder()
                .userId("user-1")
                .encryptedAccessToken(crypto.encrypt("gho_secret_value"))
                .build();
        when(connectionRepository.findByUserId("user-1")).thenReturn(Optional.of(connection));
        assertThat(service.tokenFor("user-1")).isEqualTo("gho_secret_value");
    }

    private static String extractState(String url) {
        for (String part : url.split("&")) {
            if (part.startsWith("state=")) return part.substring(6);
        }
        throw new IllegalStateException("no state in url: " + url);
    }
}
