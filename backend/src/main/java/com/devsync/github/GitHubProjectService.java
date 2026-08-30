package com.devsync.github;

import com.devsync.activity.ActivityService;
import com.devsync.activity.entity.ActivityType;
import com.devsync.audit.AuditLogService;
import com.devsync.audit.entity.AuditAction;
import com.devsync.audit.entity.AuditStatus;
import com.devsync.common.ResourceNotFoundException;
import com.devsync.github.dto.GitHubBranchDto;
import com.devsync.github.dto.GitHubCommitDto;
import com.devsync.github.dto.GitHubIssueDto;
import com.devsync.github.dto.GitHubLinkRequest;
import com.devsync.github.dto.GitHubLinkResponse;
import com.devsync.github.dto.GitHubPullRequestDto;
import com.devsync.github.dto.GitHubRepoDto;
import com.devsync.github.entity.ProjectGitHubLink;
import com.devsync.github.repository.ProjectGitHubLinkRepository;
import com.devsync.project.entity.Project;
import com.devsync.project.entity.ProjectMember;
import com.devsync.project.repository.ProjectMemberRepository;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Links a DevSync project to one GitHub repository and serves repository data
 * (commits / issues / pull requests) to authorized project members.
 */
@Service
@RequiredArgsConstructor
public class GitHubProjectService {

    private static final int DEFAULT_PER_PAGE = 20;

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final ProjectGitHubLinkRepository linkRepository;
    private final GitHubIntegrationService integrationService;
    private final GitHubClient githubClient;
    private final AuditLogService auditLogService;
    private final ActivityService activityService;

    // ── link state ───────────────────────────────────────────

    @Transactional(readOnly = true)
    public GitHubLinkResponse getLink(String projectId, String userId) {
        requireViewAccess(projectId, userId);
        return linkRepository.findByProjectId(projectId)
                .map(this::toResponse)
                .orElse(null);
    }

    @Transactional
    public GitHubLinkResponse linkRepo(String projectId, String userId, GitHubLinkRequest request) {
        Project project = requireManageAccess(projectId, userId);
        String repoFullName = request == null || request.getRepoFullName() == null
                ? "" : request.getRepoFullName().trim();
        if (repoFullName.isBlank()) {
            throw new GitHubException("repoFullName is required");
        }
        String[] parts = repoFullName.split("/");
        if (parts.length != 2 || parts[0].isBlank() || parts[1].isBlank()) {
            throw new GitHubException("repoFullName must be owner/repo");
        }

        // Token must be valid; repo must be reachable with it (404 → RepoUnavailable).
        integrationService.requireConnection(userId);
        String token = integrationService.tokenFor(userId);
        GitHubRepoDto repo = githubClient.fetchRepo(token, parts[0], parts[1]);

        // One project per repo — refuse double-linking to keep the mapping clean.
        linkRepository.findByRepoId(repo.getId())
                .filter(existing -> !existing.getProjectId().equals(projectId))
                .ifPresent(existing -> {
                    throw new GitHubException("This repository is already linked to another project");
                });

        ProjectGitHubLink link = linkRepository.findByProjectId(projectId).orElseGet(() ->
                ProjectGitHubLink.builder()
                        .projectId(projectId)
                        .linkedBy(userId)
                        .linkedAt(Instant.now())
                        .build());
        link.setRepoId(repo.getId());
        link.setRepoFullName(repo.getFullName());
        link.setRepoUrl(repo.getHtmlUrl());
        link.setRepoDescription(repo.getDescription());
        link.setRepoVisibility(repo.getVisibility());
        link.setRepoLanguage(repo.getLanguage());
        link.setRepoDefaultBranch(repo.getDefaultBranch());
        linkRepository.save(link);

        project.setRepositoryUrl(repo.getHtmlUrl());
        projectRepository.save(project);

        auditLogService.record(userId, projectId, AuditAction.REPO_LINKED, AuditStatus.SUCCESS,
                "Linked GitHub repository " + repo.getFullName() + " to project " + project.getName());
        activityService.record(userId, projectId, ActivityType.PROJECT_UPDATED,
                "GitHub repository linked", repo.getFullName(), null);
        return toResponse(link);
    }

    @Transactional
    public void unlinkRepo(String projectId, String userId) {
        Project project = requireManageAccess(projectId, userId);
        ProjectGitHubLink link = linkRepository.findByProjectId(projectId)
                .orElseThrow(() -> new GitHubException("No GitHub repository is linked to this project"));
        linkRepository.deleteByProjectId(projectId);

        if (project.getRepositoryUrl() != null && project.getRepositoryUrl().equals(link.getRepoUrl())) {
            project.setRepositoryUrl(null);
            projectRepository.save(project);
        }
        auditLogService.record(userId, projectId, AuditAction.REPO_UNLINKED, AuditStatus.SUCCESS,
                "Unlinked GitHub repository " + link.getRepoFullName() + " from project " + project.getName());
        activityService.record(userId, projectId, ActivityType.PROJECT_UPDATED,
                "GitHub repository unlinked", link.getRepoFullName(), null);
    }

    // ── repository data (members can view) ───────────────────

    @Transactional(readOnly = true)
    public List<GitHubCommitDto> getCommits(String projectId, String userId, String branch, Integer perPage) {
        ProjectGitHubLink link = linkedRepoForMember(projectId, userId);
        String token = integrationService.tokenFor(userId);
        return githubClient.fetchCommits(token, ownerOf(link), nameOf(link),
                branch != null ? branch : link.getRepoDefaultBranch(), pageSize(perPage));
    }

    @Transactional(readOnly = true)
    public List<GitHubIssueDto> getIssues(String projectId, String userId, String state, Integer perPage) {
        ProjectGitHubLink link = linkedRepoForMember(projectId, userId);
        String token = integrationService.tokenFor(userId);
        return githubClient.fetchIssues(token, ownerOf(link), nameOf(link),
                "closed".equalsIgnoreCase(state) ? "closed" : "open", pageSize(perPage));
    }

    @Transactional(readOnly = true)
    public List<GitHubBranchDto> getBranches(String projectId, String userId, Integer perPage) {
        ProjectGitHubLink link = linkedRepoForMember(projectId, userId);
        String token = integrationService.tokenFor(userId);
        return githubClient.fetchBranches(token, ownerOf(link), nameOf(link), pageSize(perPage));
    }

    @Transactional(readOnly = true)
    public List<GitHubPullRequestDto> getPullRequests(String projectId, String userId, String state, Integer perPage) {
        ProjectGitHubLink link = linkedRepoForMember(projectId, userId);
        String token = integrationService.tokenFor(userId);
        return githubClient.fetchPullRequests(token, ownerOf(link), nameOf(link),
                "closed".equalsIgnoreCase(state) ? "closed" : "open", pageSize(perPage));
    }

    // ── helpers ──────────────────────────────────────────────

    private ProjectGitHubLink linkedRepoForMember(String projectId, String userId) {
        requireViewAccess(projectId, userId);
        return linkRepository.findByProjectId(projectId)
                .orElseThrow(() -> new GitHubException("No GitHub repository is linked to this project"));
    }

    private Project requireViewAccess(String projectId, String userId) {
        Project project = findProject(projectId);
        if (!canView(project, userId)) {
            throw new GitHubException("You are not a member of this project",
                    org.springframework.http.HttpStatus.FORBIDDEN);
        }
        return project;
    }

    private Project requireManageAccess(String projectId, String userId) {
        Project project = findProject(projectId);
        if (!canManage(project, userId)) {
            throw new GitHubException("Only the project owner can manage the GitHub link",
                    org.springframework.http.HttpStatus.FORBIDDEN);
        }
        return project;
    }

    private Project findProject(String projectId) {
        return projectRepository.findById(projectId)
                .filter(p -> !p.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
    }

    private boolean canView(Project project, String userId) {
        if (project.getOwnerId().equals(userId)) return true;
        User user = userRepository.findById(userId).orElse(null);
        if (user != null && user.getRole() == User.Role.ADMIN) return true;
        return memberRepository.existsByProjectIdAndUserId(project.getId(), userId);
    }

    private boolean canManage(Project project, String userId) {
        if (project.getOwnerId().equals(userId)) return true;
        User user = userRepository.findById(userId).orElse(null);
        return user != null && user.getRole() == User.Role.ADMIN;
    }

    private String ownerOf(ProjectGitHubLink link) {
        return link.getRepoFullName().split("/")[0];
    }

    private String nameOf(ProjectGitHubLink link) {
        return link.getRepoFullName().split("/")[1];
    }

    private int pageSize(Integer perPage) {
        if (perPage == null) return DEFAULT_PER_PAGE;
        return Math.min(Math.max(perPage, 1), 100);
    }

    private GitHubLinkResponse toResponse(ProjectGitHubLink link) {
        return GitHubLinkResponse.builder()
                .projectId(link.getProjectId())
                .repoId(link.getRepoId())
                .repoFullName(link.getRepoFullName())
                .repoUrl(link.getRepoUrl())
                .repoDescription(link.getRepoDescription())
                .repoVisibility(link.getRepoVisibility())
                .repoLanguage(link.getRepoLanguage())
                .repoDefaultBranch(link.getRepoDefaultBranch())
                .linkedAt(link.getLinkedAt())
                .build();
    }
}
