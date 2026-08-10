package com.devsync.github;

import com.devsync.audit.AuditLogService;
import com.devsync.audit.entity.AuditAction;
import com.devsync.audit.entity.AuditStatus;
import com.devsync.github.dto.GitHubAuthUrlResponse;
import com.devsync.github.dto.GitHubConnectionResponse;
import com.devsync.github.dto.GitHubRepoDto;
import com.devsync.github.entity.GitHubConnection;
import com.devsync.github.repository.GitHubConnectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Owns the GitHub OAuth connection lifecycle. Access tokens are exchanged by
 * the server, encrypted at rest, and never returned by any endpoint.
 */
@Service
@RequiredArgsConstructor
public class GitHubIntegrationService {

    private static final long STATE_TTL_SECONDS = 600;
    private static final long REPO_CACHE_TTL_SECONDS = 60;
    private static final String OAUTH_AUTHORIZE = "https://github.com/login/oauth/authorize";
    private static final String OAUTH_TOKEN = "https://github.com/login/oauth/access_token";

    private final GitHubConnectionRepository connectionRepository;
    private final GitHubTokenCrypto tokenCrypto;
    private final GitHubClient githubClient;
    private final GitHubOAuthClient oauthClient;
    private final AuditLogService auditLogService;

    @Value("${app.github.client-id:}")
    private String clientId;
    @Value("${app.github.client-secret:}")
    private String clientSecret;
    @Value("${app.github.redirect-uri:http://localhost:8080/api/github/callback}")
    private String redirectUri;
    @Value("${app.github.frontend-url:${FRONTEND_URL:http://localhost:5173}}")
    private String frontendUrl;

    /** state → {userId, expiresAt} — single-use, expiring (stateless app, no sessions). */
    private final Map<String, OAuthState> pendingStates = new ConcurrentHashMap<>();
    /** userId → cached repo list (controlled sync — never per-page-request GitHub calls). */
    private final Map<String, CachedRepos> repoCache = new ConcurrentHashMap<>();

    // ── status ───────────────────────────────────────────────

    @Transactional(readOnly = true)
    public GitHubConnectionResponse getConnectionStatus(String userId) {
        return connectionRepository.findByUserId(userId)
                .map(c -> GitHubConnectionResponse.builder()
                        .connected(true)
                        .githubUsername(c.getGithubUsername())
                        .tokenScopes(c.getTokenScopes())
                        .connectedAt(c.getConnectedAt())
                        .lastSyncedAt(c.getLastSyncedAt())
                        .build())
                .orElseGet(() -> GitHubConnectionResponse.builder().connected(false).build());
    }

    // ── OAuth flow ───────────────────────────────────────────

    @Transactional(readOnly = true)
    public GitHubAuthUrlResponse createAuthUrl(String userId) {
        if (clientId.isBlank() || clientSecret.isBlank()) {
            throw new GitHubException("GitHub integration is not configured (missing GITHUB_CLIENT_ID/SECRET)");
        }
        String state = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(UUID.randomUUID().toString().getBytes(StandardCharsets.UTF_8));
        pendingStates.put(state, new OAuthState(userId, Instant.now().plusSeconds(STATE_TTL_SECONDS)));
        String url = OAUTH_AUTHORIZE
                + "?client_id=" + encode(clientId)
                + "&redirect_uri=" + encode(redirectUri)
                + "&scope=" + encode("repo,read:user,user:email")
                + "&state=" + encode(state)
                + "&prompt=consent";
        return GitHubAuthUrlResponse.builder().url(url).build();
    }

    /**
     * GitHub redirects the browser here (no JWT). The state binds the callback to
     * the user who started the flow. On success the browser is redirected back to
     * the frontend with a status flag.
     */
    @Transactional
    public String handleCallback(String code, String state) {
        OAuthState oauthState = state == null ? null : pendingStates.remove(state);
        if (oauthState == null) {
            return frontendUrl + "/settings?github=error=invalid_state";
        }
        if (Instant.now().isAfter(oauthState.expiresAt)) {
            return frontendUrl + "/settings?github=error=expired";
        }
        if (code == null || code.isBlank()) {
            return frontendUrl + "/settings?github=error=denied";
        }

        try {
            GitHubOAuthClient.TokenExchange exchange = oauthClient.exchangeCode(code, clientId, clientSecret, redirectUri);
            String username = githubClient.fetchUsername(exchange.token());

            GitHubConnection connection = connectionRepository.findByUserId(oauthState.userId)
                    .orElseGet(() -> GitHubConnection.builder()
                            .userId(oauthState.userId)
                            .connectedAt(Instant.now())
                            .build());
            connection.setGithubUsername(username);
            connection.setEncryptedAccessToken(tokenCrypto.encrypt(exchange.token()));
            connection.setTokenScopes(exchange.scopes());
            connection.setLastSyncedAt(Instant.now());
            connectionRepository.save(connection);

            auditLogService.record(oauthState.userId, oauthState.userId, AuditAction.GITHUB_CONNECTED,
                    AuditStatus.SUCCESS, "GitHub account connected: " + username);
            return frontendUrl + "/settings?github=connected";
        } catch (GitHubException.AuthRequired e) {
            return frontendUrl + "/settings?github=error=auth_failed";
        } catch (Exception e) {
            return frontendUrl + "/settings?github=error=failed";
        }
    }

    @Transactional
    public void disconnect(String userId) {
        connectionRepository.deleteByUserId(userId);
        repoCache.remove(userId);
        auditLogService.record(userId, userId, AuditAction.GITHUB_DISCONNECTED,
                AuditStatus.SUCCESS, "GitHub account disconnected");
    }

    // ── repos (controlled sync, TTL cache) ───────────────────

    public List<GitHubRepoDto> listRepos(String userId) {
        CachedRepos cached = repoCache.get(userId);
        if (cached != null && cached.expiresAt.isAfter(Instant.now())) {
            return cached.repos;
        }
        GitHubConnection connection = requireConnection(userId);
        String token = tokenCrypto.decrypt(connection.getEncryptedAccessToken());
        List<GitHubRepoDto> repos = githubClient.fetchRepos(token);
        connection.setLastSyncedAt(Instant.now());
        connectionRepository.save(connection);
        repoCache.put(userId, new CachedRepos(repos, Instant.now().plusSeconds(REPO_CACHE_TTL_SECONDS)));
        return repos;
    }

    /** Internal: resolves the user's connection, throwing AuthRequired when missing. */
    public GitHubConnection requireConnection(String userId) {
        return connectionRepository.findByUserId(userId)
                .orElseThrow(() -> new GitHubException.AuthRequired("Connect a GitHub account first"));
    }

    /** Internal: decrypted token for outbound calls. */
    public String tokenFor(String userId) {
        return tokenCrypto.decrypt(requireConnection(userId).getEncryptedAccessToken());
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private record OAuthState(String userId, Instant expiresAt) {}

    private record CachedRepos(List<GitHubRepoDto> repos, Instant expiresAt) {}
}
