package com.devsync.github;

import com.devsync.github.dto.GitHubCommitDto;
import com.devsync.github.dto.GitHubIssueDto;
import com.devsync.github.dto.GitHubPullRequestDto;
import com.devsync.github.dto.GitHubRepoDto;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
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
    private final ObjectMapper objectMapper = new ObjectMapper();

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
                prs.add(toPullRequestDto(p));
            }
        }
        return prs;
    }

    // ── branch + PR workflow (write operations) ─────────────

    /**
     * Creates a feature branch from the repo's default branch. Fails with a
     * meaningful message when the branch already exists or the token lacks
     * write access — DevSync never lets members push straight to main.
     */
    public void createBranch(String token, String owner, String repo, String newBranch, String baseBranch) {
        String baseSha = fetchBranchSha(token, owner, repo, baseBranch);
        ObjectNode body = objectMapper.createObjectNode();
        body.put("ref", "refs/heads/" + newBranch);
        body.put("sha", baseSha);
        try {
            post("/repos/" + owner + "/" + repo + "/git/refs", token, body);
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() == 422) {
                throw new GitHubException("Branch '" + newBranch + "' already exists on GitHub");
            }
            throw mapError(ex);
        }
    }

    /** The sha of a branch tip (needed to fork a new branch from it). */
    public String fetchBranchSha(String token, String owner, String repo, String branch) {
        JsonNode node = get("/repos/" + owner + "/" + repo + "/git/ref/heads/" + branch, token, JsonNode.class);
        return node.path("object").path("sha").asText(null);
    }

    /** Opens a pull request head → base and returns its real metadata. */
    public GitHubPullRequestDto createPullRequest(String token, String owner, String repo,
                                                  String title, String head, String base, String body) {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("title", title);
        payload.put("head", head);
        payload.put("base", base);
        payload.put("body", body == null ? "" : body);
        JsonNode node = post("/repos/" + owner + "/" + repo + "/pulls", token, payload);
        return toPullRequestDto(node);
    }

    /** Fetches a single PR with full lifecycle fields (merged_at, head/base refs). */
    public GitHubPullRequestDto fetchPullRequest(String token, String owner, String repo, long number) {
        return toPullRequestDto(get("/repos/" + owner + "/" + repo + "/pulls/" + number, token, JsonNode.class));
    }

    /**
     * Latest review states on a PR (e.g. APPROVED / CHANGES_REQUESTED). Empty
     * when nobody has reviewed yet.
     */
    public List<String> fetchReviewStates(String token, String owner, String repo, long number) {
        JsonNode arr = get("/repos/" + owner + "/" + repo + "/pulls/" + number + "/reviews",
                token, JsonNode.class);
        List<String> states = new ArrayList<>();
        if (arr != null && arr.isArray()) {
            for (JsonNode r : arr) {
                String state = r.path("state").asText(null);
                if (state != null && ("APPROVED".equals(state) || "CHANGES_REQUESTED".equals(state))) {
                    states.add(state);
                }
            }
        }
        return states;
    }

    /** Submits a PR review (event: APPROVE | REQUEST_CHANGES | COMMENT). */
    public void submitReview(String token, String owner, String repo, long number, String event, String body) {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("event", event);
        if (body != null && !body.isBlank()) payload.put("body", body);
        post("/repos/" + owner + "/" + repo + "/pulls/" + number + "/reviews", token, payload);
    }

    /**
     * Merges a PR on GitHub (explicit owner action only). Non-mergeable or
     * already-merged PRs surface a meaningful message instead of a generic 500.
     */
    public void mergePullRequest(String token, String owner, String repo, long number) {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("merge_method", "squash");
        try {
            put("/repos/" + owner + "/" + repo + "/pulls/" + number + "/merge", token, payload);
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() == 405) {
                throw new GitHubException("This pull request cannot be merged — it may have conflicts or already be merged");
            }
            if (ex.getStatusCode().value() == 404) {
                throw new GitHubException.RepoUnavailable("Pull request not found on GitHub");
            }
            throw mapError(ex);
        }
    }

    private GitHubPullRequestDto toPullRequestDto(JsonNode p) {
        String reviewStatus;
        if (p.path("merged_at").isNull() && p.path("draft").asBoolean(false)) {
            reviewStatus = "DRAFT";
        } else if (!p.path("merged_at").isNull()) {
            reviewStatus = "MERGED";
        } else {
            reviewStatus = "OPEN";
        }
        return GitHubPullRequestDto.builder()
                .number(p.path("number").asLong())
                .title(p.path("title").asText(null))
                .state(p.path("state").asText(null))
                .reviewStatus(reviewStatus)
                .htmlUrl(p.path("html_url").asText(null))
                .authorLogin(p.path("user").path("login").asText(null))
                .createdAt(parseDate(p.path("created_at").asText(null)))
                .mergedAt(parseDate(p.path("merged_at").asText(null)))
                .headRef(p.path("head").path("ref").asText(null))
                .baseRef(p.path("base").path("ref").asText(null))
                .build();
    }

    // ── internals ────────────────────────────────────────────

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

    private JsonNode post(String path, String token, ObjectNode payload) {
        try {
            return restClient.post()
                    .uri(path)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .header(HttpHeaders.ACCEPT, "application/vnd.github+json")
                    .header("X-GitHub-Api-Version", "2022-11-28")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(JsonNode.class);
        } catch (RestClientResponseException ex) {
            throw mapError(ex);
        }
    }

    private JsonNode put(String path, String token, ObjectNode payload) {
        try {
            return restClient.put()
                    .uri(path)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .header(HttpHeaders.ACCEPT, "application/vnd.github+json")
                    .header("X-GitHub-Api-Version", "2022-11-28")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(JsonNode.class);
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
