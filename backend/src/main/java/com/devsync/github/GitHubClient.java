package com.devsync.github;

import com.devsync.github.dto.GitHubCommitDto;
import com.devsync.github.dto.GitHubIssueDto;
import com.devsync.github.dto.GitHubPullRequestDto;
import com.devsync.github.dto.GitHubRepoDto;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Thin REST client over the GitHub API. Every call maps auth failures to
 * {@link GitHubException.AuthRequired} and rate limiting to
 * {@link GitHubException.RateLimited} so callers can react appropriately.
 */
@Component
public class GitHubClient {

    private static final String API_BASE = "https://api.github.com";

    private final RestClient restClient;

    public GitHubClient(@Value("${app.github.api-timeout-ms:10000}") long timeoutMs) {
        var factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) timeoutMs);
        factory.setReadTimeout((int) timeoutMs);
        this.restClient = RestClient.builder()
                .baseUrl(API_BASE)
                .requestFactory(factory)
                .build();
    }

    public String fetchUsername(String token) {
        JsonNode node = get("/user", token, JsonNode.class);
        return node.path("login").asText();
    }

    /** Repositories the token can see, newest-updated first. */
    public List<GitHubRepoDto> fetchRepos(String token) {
        JsonNode arr = get("/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member",
                token, JsonNode.class);
        List<GitHubRepoDto> repos = new ArrayList<>();
        if (arr != null && arr.isArray()) {
            for (JsonNode r : arr) {
                repos.add(GitHubRepoDto.builder()
                        .id(r.path("id").asLong())
                        .fullName(r.path("full_name").asText(null))
                        .name(r.path("name").asText(null))
                        .description(r.path("description").asText(null))
                        .htmlUrl(r.path("html_url").asText(null))
                        .visibility(r.path("visibility").asText(null))
                        .language(r.path("language").asText(null))
                        .stargazersCount(r.path("stargazers_count").asInt(0))
                        .forksCount(r.path("forks_count").asInt(0))
                        .defaultBranch(r.path("default_branch").asText("main"))
                        .updatedAt(parseDate(r.path("updated_at").asText(null)))
                        .build());
            }
        }
        return repos;
    }

    /** Fetches a single repo to validate the user can access it (404 → RepoUnavailable). */
    public GitHubRepoDto fetchRepo(String token, String owner, String repo) {
        JsonNode r = get("/repos/" + owner + "/" + repo, token, JsonNode.class);
        return GitHubRepoDto.builder()
                .id(r.path("id").asLong())
                .fullName(r.path("full_name").asText(null))
                .name(r.path("name").asText(null))
                .description(r.path("description").asText(null))
                .htmlUrl(r.path("html_url").asText(null))
                .visibility(r.path("visibility").asText(null))
                .language(r.path("language").asText(null))
                .stargazersCount(r.path("stargazers_count").asInt(0))
                .forksCount(r.path("forks_count").asInt(0))
                .defaultBranch(r.path("default_branch").asText("main"))
                .updatedAt(parseDate(r.path("updated_at").asText(null)))
                .build();
    }

    public List<GitHubCommitDto> fetchCommits(String token, String owner, String repo, String branch, int perPage) {
        String branchQuery = (branch == null || branch.isBlank()) ? "" : "&sha=" + branch;
        JsonNode arr = get("/repos/" + owner + "/" + repo + "/commits?per_page=" + perPage + branchQuery,
                token, JsonNode.class);
        List<GitHubCommitDto> commits = new ArrayList<>();
        if (arr != null && arr.isArray()) {
            for (JsonNode c : arr) {
                JsonNode commit = c.path("commit");
                commits.add(GitHubCommitDto.builder()
                        .sha(c.path("sha").asText(null))
                        .message(commit.path("message").asText(null))
                        .authorName(commit.path("author").path("name").asText(null))
                        .authorLogin(c.path("author").path("login").asText(null))
                        .timestamp(parseDate(commit.path("author").path("date").asText(null)))
                        .build());
            }
        }
        return commits;
    }

    public List<GitHubIssueDto> fetchIssues(String token, String owner, String repo, String state, int perPage) {
        JsonNode arr = get("/repos/" + owner + "/" + repo + "/issues?state=" + state + "&per_page=" + perPage,
                token, JsonNode.class);
        List<GitHubIssueDto> issues = new ArrayList<>();
        if (arr != null && arr.isArray()) {
            for (JsonNode i : arr) {
                // GitHub's issues endpoint also returns pull requests — skip them.
                if (i.has("pull_request")) continue;
                List<String> labels = new ArrayList<>();
                for (JsonNode l : i.path("labels")) labels.add(l.path("name").asText());
                issues.add(GitHubIssueDto.builder()
                        .number(i.path("number").asLong())
                        .title(i.path("title").asText(null))
                        .state(i.path("state").asText(null))
                        .htmlUrl(i.path("html_url").asText(null))
                        .authorLogin(i.path("user").path("login").asText(null))
                        .assigneeLogin(i.path("assignee").path("login").asText(null))
                        .labels(labels)
                        .createdAt(parseDate(i.path("created_at").asText(null)))
                        .build());
            }
        }
        return issues;
    }

    public List<GitHubPullRequestDto> fetchPullRequests(String token, String owner, String repo, String state, int perPage) {
        JsonNode arr = get("/repos/" + owner + "/" + repo + "/pulls?state=" + state + "&per_page=" + perPage,
                token, JsonNode.class);
        List<GitHubPullRequestDto> prs = new ArrayList<>();
        if (arr != null && arr.isArray()) {
            for (JsonNode p : arr) {
                String reviewStatus;
                if (p.path("merged_at").isNull() && p.path("draft").asBoolean(false)) {
                    reviewStatus = "DRAFT";
                } else if (!p.path("merged_at").isNull()) {
                    reviewStatus = "MERGED";
                } else {
                    reviewStatus = "OPEN";
                }
                prs.add(GitHubPullRequestDto.builder()
                        .number(p.path("number").asLong())
                        .title(p.path("title").asText(null))
                        .state(p.path("state").asText(null))
                        .reviewStatus(reviewStatus)
                        .htmlUrl(p.path("html_url").asText(null))
                        .authorLogin(p.path("user").path("login").asText(null))
                        .createdAt(parseDate(p.path("created_at").asText(null)))
                        .mergedAt(parseDate(p.path("merged_at").asText(null)))
                        .build());
            }
        }
        return prs;
    }

    // ── internals ────────────────────────────────────────────

    private <T> T get(String path, String token, Class<T> type) {
        try {
            return restClient.get()
                    .uri(path)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .header(HttpHeaders.ACCEPT, "application/vnd.github+json")
                    .header("X-GitHub-Api-Version", "2022-11-28")
                    .retrieve()
                    .body(type);
        } catch (RestClientResponseException ex) {
            throw mapError(ex);
        }
    }

    /** Maps GitHub API errors to typed exceptions (package-private for tests). */
    static GitHubException mapError(RestClientResponseException ex) {
        if (ex.getStatusCode().value() == 401) {
            return new GitHubException.AuthRequired("GitHub authorization is invalid or expired — reconnect your account");
        }
        if (ex.getStatusCode().value() == 403) {
            long reset = parseHeaderEpoch(ex.getResponseHeaders(), "X-RateLimit-Reset");
            if (reset == 0) {
                reset = System.currentTimeMillis() / 1000 + 60;
            }
            return new GitHubException.RateLimited("GitHub API rate limit exceeded — try again later", reset);
        }
        if (ex.getStatusCode().value() == 404) {
            return new GitHubException.RepoUnavailable("Repository not found or no longer accessible");
        }
        return new GitHubException("GitHub API error: " + ex.getStatusCode().value());
    }

    private static long parseHeaderEpoch(HttpHeaders headers, String name) {
        String value = headers == null ? null : headers.getFirst(name);
        if (value == null || value.isBlank()) return 0;
        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private Instant parseDate(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Instant.parse(value);
        } catch (Exception e) {
            return null;
        }
    }
}
