package com.devsync.github;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.web.client.RestClientResponseException;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class GitHubClientTest {

    private RestClientResponseException ex(int status, HttpHeaders headers) {
        return new RestClientResponseException("boom", status, "status", headers, new byte[0], StandardCharsets.UTF_8);
    }

    @Test
    void mapError_shouldMap401_ToAuthRequired() {
        GitHubException e = GitHubClient.mapError(ex(401, new HttpHeaders()));
        assertThat(e).isInstanceOf(GitHubException.AuthRequired.class);
        assertThat(e.getStatus().value()).isEqualTo(401);
    }

    @Test
    void mapError_shouldMap403_ToRateLimited_WithResetTime() {
        HttpHeaders headers = new HttpHeaders();
        headers.add("X-RateLimit-Reset", "9999999999");
        GitHubException e = GitHubClient.mapError(ex(403, headers));
        assertThat(e).isInstanceOf(GitHubException.RateLimited.class);
        assertThat(((GitHubException.RateLimited) e).getResetEpochSeconds()).isEqualTo(9999999999L);
        assertThat(e.getStatus().value()).isEqualTo(429);
    }

    @Test
    void mapError_shouldMap403_WithoutResetHeader_ToRateLimited_WithFallback() {
        GitHubException e = GitHubClient.mapError(ex(403, new HttpHeaders()));
        assertThat(e).isInstanceOf(GitHubException.RateLimited.class);
        // Falls back to now+60s when the header is missing.
        assertThat(((GitHubException.RateLimited) e).getResetEpochSeconds())
                .isGreaterThanOrEqualTo(System.currentTimeMillis() / 1000);
    }

    @Test
    void mapError_shouldMap404_ToRepoUnavailable() {
        GitHubException e = GitHubClient.mapError(ex(404, new HttpHeaders()));
        assertThat(e).isInstanceOf(GitHubException.RepoUnavailable.class);
        assertThat(e.getStatus().value()).isEqualTo(404);
    }
}
