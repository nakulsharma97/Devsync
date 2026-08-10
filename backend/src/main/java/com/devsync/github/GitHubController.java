package com.devsync.github;

import com.devsync.github.dto.GitHubAuthUrlResponse;
import com.devsync.github.dto.GitHubCommitDto;
import com.devsync.github.dto.GitHubConnectionResponse;
import com.devsync.github.dto.GitHubIssueDto;
import com.devsync.github.dto.GitHubLinkRequest;
import com.devsync.github.dto.GitHubLinkResponse;
import com.devsync.github.dto.GitHubPullRequestDto;
import com.devsync.github.dto.GitHubRepoDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/github")
@RequiredArgsConstructor
public class GitHubController {

    private final GitHubIntegrationService integrationService;
    private final GitHubProjectService projectService;

    // ── connection ───────────────────────────────────────────

    @GetMapping("/connection")
    public ResponseEntity<GitHubConnectionResponse> connectionStatus(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(integrationService.getConnectionStatus(userDetails.getUsername()));
    }

    @GetMapping("/auth-url")
    public ResponseEntity<GitHubAuthUrlResponse> authUrl(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(integrationService.createAuthUrl(userDetails.getUsername()));
    }

    /** GitHub redirects the browser here — no JWT. Bound to the user via the state param. */
    @GetMapping("/callback")
    public ResponseEntity<Void> callback(@RequestParam(required = false) String code,
                                         @RequestParam(required = false) String state) {
        String redirect = integrationService.handleCallback(code, state);
        return ResponseEntity.status(302).header("Location", redirect).build();
    }

    @DeleteMapping("/connection")
    public ResponseEntity<Void> disconnect(@AuthenticationPrincipal UserDetails userDetails) {
        integrationService.disconnect(userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    // ── repositories ─────────────────────────────────────────

    @GetMapping("/repos")
    public ResponseEntity<List<GitHubRepoDto>> listRepos(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(integrationService.listRepos(userDetails.getUsername()));
    }

    // ── project linking ──────────────────────────────────────

    @GetMapping("/projects/{projectId}/link")
    public ResponseEntity<GitHubLinkResponse> getLink(@PathVariable String projectId,
                                                      @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(projectService.getLink(projectId, userDetails.getUsername()));
    }

    @PostMapping("/projects/{projectId}/link")
    public ResponseEntity<GitHubLinkResponse> link(@PathVariable String projectId,
                                                   @Valid @RequestBody GitHubLinkRequest request,
                                                   @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(projectService.linkRepo(projectId, userDetails.getUsername(), request));
    }

    @DeleteMapping("/projects/{projectId}/link")
    public ResponseEntity<Void> unlink(@PathVariable String projectId,
                                       @AuthenticationPrincipal UserDetails userDetails) {
        projectService.unlinkRepo(projectId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    // ── repository data (project members) ────────────────────

    @GetMapping("/projects/{projectId}/commits")
    public ResponseEntity<List<GitHubCommitDto>> commits(@PathVariable String projectId,
                                                         @RequestParam(required = false) String branch,
                                                         @RequestParam(required = false) Integer perPage,
                                                         @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(projectService.getCommits(projectId, userDetails.getUsername(), branch, perPage));
    }

    @GetMapping("/projects/{projectId}/issues")
    public ResponseEntity<List<GitHubIssueDto>> issues(@PathVariable String projectId,
                                                       @RequestParam(defaultValue = "open") String state,
                                                       @RequestParam(required = false) Integer perPage,
                                                       @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(projectService.getIssues(projectId, userDetails.getUsername(), state, perPage));
    }

    @GetMapping("/projects/{projectId}/pulls")
    public ResponseEntity<List<GitHubPullRequestDto>> pulls(@PathVariable String projectId,
                                                            @RequestParam(defaultValue = "open") String state,
                                                            @RequestParam(required = false) Integer perPage,
                                                            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(projectService.getPullRequests(projectId, userDetails.getUsername(), state, perPage));
    }
}
