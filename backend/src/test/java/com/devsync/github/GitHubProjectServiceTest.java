package com.devsync.github;

import com.devsync.activity.ActivityService;
import com.devsync.activity.entity.ActivityType;
import com.devsync.audit.AuditLogService;
import com.devsync.audit.entity.AuditAction;
import com.devsync.audit.entity.AuditStatus;
import com.devsync.github.dto.GitHubCommitDto;
import com.devsync.github.dto.GitHubLinkRequest;
import com.devsync.github.dto.GitHubRepoDto;
import com.devsync.github.entity.GitHubConnection;
import com.devsync.github.entity.ProjectGitHubLink;
import com.devsync.github.repository.ProjectGitHubLinkRepository;
import com.devsync.project.entity.Project;
import com.devsync.project.entity.ProjectMember;
import com.devsync.project.repository.ProjectMemberRepository;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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
class GitHubProjectServiceTest {

    @Mock private ProjectRepository projectRepository;
    @Mock private ProjectMemberRepository memberRepository;
    @Mock private UserRepository userRepository;
    @Mock private ProjectGitHubLinkRepository linkRepository;
    @Mock private GitHubIntegrationService integrationService;
    @Mock private GitHubClient githubClient;
    @Mock private AuditLogService auditLogService;
    @Mock private ActivityService activityService;

    private GitHubProjectService service;

    @BeforeEach
    void setUp() {
        service = new GitHubProjectService(projectRepository, memberRepository, userRepository,
                linkRepository, integrationService, githubClient, auditLogService, activityService);
    }

    private Project project(String id, String ownerId) {
        Project p = Project.builder().name("P").ownerId(ownerId).build();
        p.setId(id);
        return p;
    }

    private void stubConnection() {
        when(integrationService.requireConnection(anyString()))
                .thenReturn(GitHubConnection.builder().userId("owner").build());
        when(integrationService.tokenFor(anyString())).thenReturn("gho_token");
    }

    @Test
    void linkRepo_shouldLink_WhenOwner() {
        Project project = project("p1", "owner");
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        stubConnection();
        GitHubRepoDto repo = GitHubRepoDto.builder()
                .id(101L).fullName("octocat/hello-world").htmlUrl("https://github.com/octocat/hello-world")
                .description("A repo").visibility("public").language("Java").defaultBranch("main").build();
        when(githubClient.fetchRepo("gho_token", "octocat", "hello-world")).thenReturn(repo);
        when(linkRepository.findByRepoId(101L)).thenReturn(Optional.empty());
        when(linkRepository.findByProjectId("p1")).thenReturn(Optional.empty());
        when(linkRepository.save(any(ProjectGitHubLink.class))).thenAnswer(inv -> inv.getArgument(0));

        GitHubLinkRequest request = new GitHubLinkRequest();
        request.setRepoFullName("octocat/hello-world");
        var response = service.linkRepo("p1", "owner", request);

        assertThat(response.getRepoFullName()).isEqualTo("octocat/hello-world");
        assertThat(project.getRepositoryUrl()).isEqualTo("https://github.com/octocat/hello-world");
        verify(projectRepository).save(project);
        verify(auditLogService).record(eq("owner"), eq("p1"), eq(AuditAction.REPO_LINKED),
                eq(AuditStatus.SUCCESS), anyString());
        verify(activityService).record(eq("owner"), eq("p1"), eq(ActivityType.PROJECT_UPDATED),
                anyString(), eq("octocat/hello-world"), any());
    }

    @Test
    void linkRepo_shouldReject_NonOwner() {
        Project project = project("p1", "owner");
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        // Stranger has no owner/member/admin relationship — user lookup is empty.
        when(userRepository.findById("stranger")).thenReturn(Optional.empty());

        GitHubLinkRequest request = new GitHubLinkRequest();
        request.setRepoFullName("octocat/hello-world");
        assertThatThrownBy(() -> service.linkRepo("p1", "stranger", request))
                .isInstanceOf(GitHubException.class);
        verify(linkRepository, never()).save(any());
        verify(githubClient, never()).fetchRepo(anyString(), anyString(), anyString());
    }

    @Test
    void linkRepo_shouldReject_WhenNoConnection() {
        Project project = project("p1", "owner");
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(integrationService.requireConnection("owner"))
                .thenThrow(new GitHubException.AuthRequired("Connect a GitHub account first"));

        GitHubLinkRequest request = new GitHubLinkRequest();
        request.setRepoFullName("octocat/hello-world");
        assertThatThrownBy(() -> service.linkRepo("p1", "owner", request))
                .isInstanceOf(GitHubException.AuthRequired.class);
        verify(linkRepository, never()).save(any());
    }

    @Test
    void linkRepo_shouldReject_RepoAlreadyLinkedToAnotherProject() {
        Project project = project("p1", "owner");
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        stubConnection();
        GitHubRepoDto repo = GitHubRepoDto.builder().id(101L).fullName("o/r").build();
        when(githubClient.fetchRepo(anyString(), anyString(), anyString())).thenReturn(repo);
        ProjectGitHubLink elsewhere = ProjectGitHubLink.builder().projectId("p2").build();
        when(linkRepository.findByRepoId(101L)).thenReturn(Optional.of(elsewhere));

        GitHubLinkRequest request = new GitHubLinkRequest();
        request.setRepoFullName("o/r");
        assertThatThrownBy(() -> service.linkRepo("p1", "owner", request))
                .isInstanceOf(GitHubException.class)
                .hasMessageContaining("already linked");
        verify(linkRepository, never()).save(any());
    }

    @Test
    void linkRepo_shouldReject_InvalidRepoName() {
        Project project = project("p1", "owner");
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));

        GitHubLinkRequest request = new GitHubLinkRequest();
        request.setRepoFullName("not-a-valid-name");
        assertThatThrownBy(() -> service.linkRepo("p1", "owner", request))
                .isInstanceOf(GitHubException.class)
                .hasMessageContaining("owner/repo");
    }

    @Test
    void unlinkRepo_shouldClearRepositoryUrl_WhenOwner() {
        Project project = project("p1", "owner");
        project.setRepositoryUrl("https://github.com/o/r");
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        ProjectGitHubLink link = ProjectGitHubLink.builder()
                .projectId("p1").repoFullName("o/r").repoUrl("https://github.com/o/r").build();
        when(linkRepository.findByProjectId("p1")).thenReturn(Optional.of(link));

        service.unlinkRepo("p1", "owner");

        verify(linkRepository).deleteByProjectId("p1");
        assertThat(project.getRepositoryUrl()).isNull();
        verify(projectRepository).save(project);
        verify(auditLogService).record(eq("owner"), eq("p1"), eq(AuditAction.REPO_UNLINKED),
                eq(AuditStatus.SUCCESS), anyString());
    }

    @Test
    void getCommits_shouldServeMember() {
        Project project = project("p1", "owner");
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(memberRepository.existsByProjectIdAndUserId("p1", "member")).thenReturn(true);
        ProjectGitHubLink link = ProjectGitHubLink.builder()
                .projectId("p1").repoFullName("o/r").repoDefaultBranch("main").build();
        when(linkRepository.findByProjectId("p1")).thenReturn(Optional.of(link));
        when(integrationService.tokenFor("member")).thenReturn("gho_token");
        when(githubClient.fetchCommits("gho_token", "o", "r", "main", 20))
                .thenReturn(List.of(GitHubCommitDto.builder().sha("abc").message("fix").build()));

        var commits = service.getCommits("p1", "member", null, null);
        assertThat(commits).hasSize(1);
        assertThat(commits.get(0).getSha()).isEqualTo("abc");
    }

    @Test
    void getCommits_shouldReject_Stranger() {
        Project project = project("p1", "owner");
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(userRepository.findById("stranger")).thenReturn(Optional.empty());
        when(memberRepository.existsByProjectIdAndUserId("p1", "stranger")).thenReturn(false);

        assertThatThrownBy(() -> service.getCommits("p1", "stranger", null, null))
                .isInstanceOf(GitHubException.class);
        verify(githubClient, never()).fetchCommits(anyString(), anyString(), anyString(), anyString(), anyInt());
    }
}
