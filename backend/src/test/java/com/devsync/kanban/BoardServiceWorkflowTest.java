package com.devsync.kanban;

import com.devsync.activity.ActivityService;
import com.devsync.activity.entity.ActivityType;
import com.devsync.github.GitHubClient;
import com.devsync.github.GitHubException;
import com.devsync.github.GitHubIntegrationService;
import com.devsync.github.dto.GitHubPullRequestDto;
import com.devsync.github.entity.ProjectGitHubLink;
import com.devsync.github.repository.ProjectGitHubLinkRepository;
import com.devsync.kanban.entity.Board;
import com.devsync.kanban.entity.BoardColumn;
import com.devsync.kanban.entity.Task;
import com.devsync.kanban.repository.BoardColumnRepository;
import com.devsync.kanban.repository.BoardRepository;
import com.devsync.kanban.repository.TaskDependencyRepository;
import com.devsync.kanban.repository.TaskRepository;
import com.devsync.notification.NotificationService;
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
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * GitHub-based development workflow: task start, branch creation, PR lifecycle,
 * review + merge — authorization (assignee / owner / admin), real GitHub calls,
 * notifications and activity.
 */
@ExtendWith(MockitoExtension.class)
class BoardServiceWorkflowTest {

    @Mock private BoardRepository boardRepository;
    @Mock private BoardColumnRepository columnRepository;
    @Mock private TaskRepository taskRepository;
    @Mock private TaskDependencyRepository dependencyRepository;
    @Mock private UserRepository userRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private ProjectMemberRepository projectMemberRepository;
    @Mock private ActivityService activityService;
    @Mock private NotificationService notificationService;
    @Mock private GitHubClient githubClient;
    @Mock private GitHubIntegrationService githubIntegrationService;
    @Mock private ProjectGitHubLinkRepository githubLinkRepository;

    private BoardService boardService;

    private Project project;
    private Board board;
    private Task task;
    private BoardColumn colTodo;
    private BoardColumn colProgress;
    private BoardColumn colDone;
    private ProjectGitHubLink link;

    @BeforeEach
    void setUp() {
        boardService = new BoardService(boardRepository, columnRepository, taskRepository,
                dependencyRepository,
                userRepository, projectRepository, projectMemberRepository, activityService,
                notificationService, githubClient, githubIntegrationService, githubLinkRepository);

        project = Project.builder().name("Skill Swapper")
                .ownerId("owner-1").status(Project.ProjectStatus.ACTIVE).build();
        project.setId("p1");
        board = Board.builder().projectId("p1").build();
        board.setId("board-1");
        task = Task.builder().title("Implement Login API")
                .boardId("board-1").columnId("col-todo").assigneeId("member-1").build();
        task.setId("task-1");
        colTodo = BoardColumn.builder().name("To Do").boardId("board-1").position(0).build();
        colTodo.setId("col-todo");
        colProgress = BoardColumn.builder().name("In Progress").boardId("board-1").position(1).build();
        colProgress.setId("col-progress");
        colDone = BoardColumn.builder().name("Done").boardId("board-1").position(2).build();
        colDone.setId("col-done");
        link = ProjectGitHubLink.builder().projectId("p1")
                .repoFullName("acme/skill-swapper").repoDefaultBranch("main").build();
    }

    // ── helpers ─────────────────────────────────────────────

    /**
     * Shared board/task fixtures. Marked lenient because different workflow
     * paths touch different subsets (e.g. column moves only happen on start
     * and merge) — strict stubbing would flag harmless, unused fixture stubs.
     */
    private void stubProjectBoardAndTask() {
        lenient().when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        lenient().when(boardRepository.findById("board-1")).thenReturn(Optional.of(board));
        lenient().when(taskRepository.findById("task-1")).thenReturn(Optional.of(task));
        lenient().when(columnRepository.findById("col-todo")).thenReturn(Optional.of(colTodo));
        lenient().when(columnRepository.findByBoardIdOrderByPositionAsc("board-1"))
                .thenReturn(List.of(colTodo, colProgress, colDone));
        lenient().when(dependencyRepository.findByTaskId("task-1")).thenReturn(List.of());
        lenient().when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(taskRepository.findMaxPositionByColumnId(anyString())).thenReturn(Optional.of(0));
        lenient().when(taskRepository.findByColumnIdOrderByPositionAsc(anyString())).thenReturn(List.of());
    }

    private void stubMember(String userId, ProjectMember.Role role) {
        when(projectMemberRepository.findByProjectIdAndUserId("p1", userId))
                .thenReturn(Optional.of(ProjectMember.builder()
                        .projectId("p1").userId(userId).role(role).build()));
    }

    private void stubUser(String userId, String name) {
        User user = User.builder().fullName(name).role(User.Role.USER).build();
        user.setId(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
    }

    private void stubLinkAndToken() {
        when(githubLinkRepository.findByProjectId("p1")).thenReturn(Optional.of(link));
        when(githubIntegrationService.tokenFor(anyString())).thenReturn("token");
    }

    private GitHubPullRequestDto openPrDto() {
        return GitHubPullRequestDto.builder()
                .number(42).state("open").htmlUrl("https://github.com/acme/skill-swapper/pull/42")
                .headRef("feature/implement-login-api").baseRef("main")
                .createdAt(Instant.parse("2026-08-17T09:00:00Z"))
                .build();
    }

    // ── start task ──────────────────────────────────────────

    @Test
    void startTask_shouldSuggestBranch_andMarkStarted() {
        stubProjectBoardAndTask();
        stubMember("member-1", ProjectMember.Role.MEMBER);
        stubUser("member-1", "Member One");

        var result = boardService.startTask("task-1", "member-1");

        assertThat(result.getBranchName()).startsWith("feature/");
        assertThat(result.getStartedAt()).isNotNull();
        // TO DO → IN PROGRESS on start.
        assertThat(result.getColumnId()).isEqualTo("col-progress");
        verify(activityService).record(eq("member-1"), eq("p1"), eq(ActivityType.TASK_STARTED),
                anyString(), eq("Implement Login API"), any());
        verify(notificationService).createNotification(eq("owner-1"), eq("TASK_STARTED"), anyString(),
                contains("Member One"), any(), anyString(), any(), anyString(), anyString(), anyString());
    }

    @Test
    void startTask_shouldBeIdempotent_ForAssignee() {
        task.setStartedAt(Instant.now());
        task.setBranchName("feature/implement-login-api");
        stubProjectBoardAndTask();
        stubMember("member-1", ProjectMember.Role.MEMBER);
        stubUser("member-1", "Member One");

        var result = boardService.startTask("task-1", "member-1");

        verify(activityService, never()).record(anyString(), anyString(), eq(ActivityType.TASK_STARTED),
                anyString(), anyString(), any());
        assertThat(result.getBranchName()).isEqualTo("feature/implement-login-api");
    }

    @Test
    void startTask_shouldReject_WhenAssignedToAnotherMember() {
        task.setAssigneeId("member-2");
        stubProjectBoardAndTask();
        stubMember("member-1", ProjectMember.Role.MEMBER);
        stubUser("member-1", "Member One");
        stubUser("member-2", "Rahul Sharma");

        assertThatThrownBy(() -> boardService.startTask("task-1", "member-1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already assigned to Rahul Sharma");
        verify(taskRepository, never()).save(any());
    }

    @Test
    void startTask_shouldReject_ForViewer() {
        stubProjectBoardAndTask();
        stubMember("viewer-1", ProjectMember.Role.VIEWER);
        stubUser("viewer-1", "Viewer One");

        assertThatThrownBy(() -> boardService.startTask("task-1", "viewer-1"))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
    }

    @Test
    void startTask_shouldReject_ForNonMember() {
        stubProjectBoardAndTask();
        stubUser("stranger", "Stranger");
        when(projectMemberRepository.findByProjectIdAndUserId("p1", "stranger"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> boardService.startTask("task-1", "stranger"))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
    }

    @Test
    void startTask_owner_canStartTaskAssignedToOther() {
        task.setAssigneeId("member-2");
        stubProjectBoardAndTask();
        stubUser("owner-1", "Owner One");
        stubUser("member-2", "Rahul Sharma");

        var result = boardService.startTask("task-1", "owner-1");

        assertThat(result.getStartedAt()).isNotNull();
        verify(activityService).record(eq("owner-1"), eq("p1"), eq(ActivityType.TASK_STARTED),
                anyString(), anyString(), any());
    }

    // ── create branch ───────────────────────────────────────

    @Test
    void createBranch_shouldCreateOnGithub_withMemberToken() {
        task.setBranchName("feature/implement-login-api");
        task.setStartedAt(Instant.now());
        stubProjectBoardAndTask();
        stubMember("member-1", ProjectMember.Role.MEMBER);
        stubUser("member-1", "Member One");
        stubLinkAndToken();

        var result = boardService.createBranch("task-1", "member-1", null);

        verify(githubClient).createBranch("token", "acme", "skill-swapper",
                "feature/implement-login-api", "main");
        verify(activityService).record(eq("member-1"), eq("p1"), eq(ActivityType.BRANCH_CREATED),
                anyString(), eq("feature/implement-login-api"), any());
        assertThat(result.getBranchName()).isEqualTo("feature/implement-login-api");
    }

    @Test
    void createBranch_shouldFail_WhenNoRepoLinked() {
        stubProjectBoardAndTask();
        stubMember("member-1", ProjectMember.Role.MEMBER);
        stubUser("member-1", "Member One");
        when(githubLinkRepository.findByProjectId("p1")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> boardService.createBranch("task-1", "member-1", null))
                .isInstanceOf(GitHubException.class)
                .hasMessageContaining("No GitHub repository is linked");
        verify(githubClient, never()).createBranch(anyString(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void createBranch_shouldReject_MainBranch() {
        stubProjectBoardAndTask();
        stubMember("member-1", ProjectMember.Role.MEMBER);
        stubUser("member-1", "Member One");
        when(githubLinkRepository.findByProjectId("p1")).thenReturn(Optional.of(link));

        assertThatThrownBy(() -> boardService.createBranch("task-1", "member-1", "main"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("main branch is not allowed");
        verify(githubClient, never()).createBranch(anyString(), anyString(), anyString(), anyString(), anyString());
    }

    // ── create pull request ─────────────────────────────────

    @Test
    void createPullRequest_shouldOpenRealPr_andStoreMetadata() {
        task.setBranchName("feature/implement-login-api");
        stubProjectBoardAndTask();
        stubMember("member-1", ProjectMember.Role.MEMBER);
        stubUser("member-1", "Member One");
        stubLinkAndToken();
        when(githubClient.createPullRequest(eq("token"), eq("acme"), eq("skill-swapper"),
                eq("Implement Login API"), eq("feature/implement-login-api"), eq("main"), isNull()))
                .thenReturn(openPrDto());

        var result = boardService.createPullRequest("task-1", "member-1", null, null);

        assertThat(result.getPullRequestNumber()).isEqualTo(42);
        assertThat(result.getPullRequestState()).isEqualTo("OPEN");
        assertThat(result.getPullRequestUrl()).contains("/pull/42");
        verify(activityService).record(eq("member-1"), eq("p1"), eq(ActivityType.PR_OPENED),
                anyString(), anyString(), any());
        verify(notificationService).createNotification(eq("owner-1"), eq("PR_OPENED"), anyString(),
                contains("Pull Request #42"), any(), anyString(), any(), anyString(), anyString(), anyString());
    }

    @Test
    void createPullRequest_shouldRequireBranchFirst() {
        stubProjectBoardAndTask();
        stubMember("member-1", ProjectMember.Role.MEMBER);
        stubUser("member-1", "Member One");

        assertThatThrownBy(() -> boardService.createPullRequest("task-1", "member-1", null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Start the task or create a branch before opening a pull request");
        verify(githubClient, never()).createPullRequest(anyString(), anyString(), anyString(),
                anyString(), anyString(), anyString(), any());
    }

    // ── review + merge (owner/admin only) ───────────────────

    @Test
    void approvePullRequest_shouldReject_ForMember() {
        task.setPullRequestNumber(42L);
        task.setPullRequestState("OPEN");
        stubProjectBoardAndTask();
        stubMember("member-1", ProjectMember.Role.MEMBER);
        stubUser("member-1", "Member One");

        assertThatThrownBy(() -> boardService.approvePullRequest("task-1", "member-1", "LGTM"))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        verify(githubClient, never()).submitReview(anyString(), anyString(), anyString(), anyLong(),
                anyString(), anyString());
    }

    @Test
    void approvePullRequest_owner_submitsReviewAndSyncsState() {
        task.setPullRequestNumber(42L);
        task.setPullRequestState("OPEN");
        stubProjectBoardAndTask();
        stubUser("owner-1", "Owner One");
        stubUser("member-1", "Member One");
        stubLinkAndToken();
        when(githubClient.fetchPullRequest("token", "acme", "skill-swapper", 42L))
                .thenReturn(openPrDto());
        when(githubClient.fetchReviewStates("token", "acme", "skill-swapper", 42L))
                .thenReturn(List.of("APPROVED"));

        var result = boardService.approvePullRequest("task-1", "owner-1", "LGTM");

        verify(githubClient).submitReview("token", "acme", "skill-swapper", 42L, "APPROVE", "LGTM");
        assertThat(result.getPullRequestState()).isEqualTo("APPROVED");
        verify(activityService).record(eq("owner-1"), eq("p1"), eq(ActivityType.PR_APPROVED),
                anyString(), anyString(), any());
        verify(notificationService).createNotification(eq("member-1"), eq("PR_APPROVED"), anyString(),
                anyString(), any(), anyString(), any(), anyString(), anyString(), anyString());
    }

    @Test
    void mergePullRequest_owner_mergesAndCompletesTask() {
        task.setPullRequestNumber(42L);
        task.setPullRequestState("OPEN");
        task.setBranchName("feature/implement-login-api");
        stubProjectBoardAndTask();
        stubUser("owner-1", "Owner One");
        stubUser("member-1", "Member One");
        stubLinkAndToken();
        when(githubClient.fetchPullRequest("token", "acme", "skill-swapper", 42L))
                .thenReturn(GitHubPullRequestDto.builder().number(42).state("closed")
                        .htmlUrl("https://github.com/acme/skill-swapper/pull/42")
                        .createdAt(Instant.parse("2026-08-17T09:00:00Z"))
                        .mergedAt(Instant.parse("2026-08-17T10:00:00Z"))
                        .headRef("feature/implement-login-api").baseRef("main").build());
        when(githubClient.fetchReviewStates("token", "acme", "skill-swapper", 42L))
                .thenReturn(List.of());

        var result = boardService.mergePullRequest("task-1", "owner-1");

        verify(githubClient).mergePullRequest("token", "acme", "skill-swapper", 42L);
        assertThat(result.getPullRequestState()).isEqualTo("MERGED");
        // Completion condition: the merged PR moves the task to Done.
        assertThat(result.getColumnId()).isEqualTo("col-done");
        verify(activityService).record(eq("owner-1"), eq("p1"), eq(ActivityType.PR_MERGED),
                anyString(), anyString(), any());
        verify(activityService).record(eq("owner-1"), eq("p1"), eq(ActivityType.TASK_COMPLETED),
                anyString(), anyString(), any());
        verify(notificationService).createNotification(eq("member-1"), eq("PR_MERGED"), anyString(),
                contains("task completed"), any(), anyString(), any(), anyString(), anyString(), anyString());
    }

    @Test
    void mergePullRequest_shouldReject_ForMember() {
        task.setPullRequestNumber(42L);
        task.setPullRequestState("OPEN");
        stubProjectBoardAndTask();
        stubMember("member-1", ProjectMember.Role.MEMBER);
        stubUser("member-1", "Member One");

        assertThatThrownBy(() -> boardService.mergePullRequest("task-1", "member-1"))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        verify(githubClient, never()).mergePullRequest(anyString(), anyString(), anyString(), anyLong());
    }

    @Test
    void mergePullRequest_shouldRequireExistingPr() {
        stubProjectBoardAndTask();

        assertThatThrownBy(() -> boardService.mergePullRequest("task-1", "owner-1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("No pull request exists");
    }

    // ── webhook-driven sync (GitHub → task) ─────────────────

    @Test
    void webhook_mergedPr_shouldCompleteTask() {
        stubProjectBoardAndTask();
        stubUser("owner-1", "Owner One");

        boardService.syncPullRequestFromEvent("task-1", new BoardService.PullRequestEvent(
                "closed", null, "owner-1", 42L,
                "https://github.com/acme/skill-swapper/pull/42",
                Instant.parse("2026-08-17T09:00:00Z"),
                Instant.parse("2026-08-17T10:00:00Z")));

        assertThat(task.getPullRequestState()).isEqualTo("MERGED");
        assertThat(task.getPullRequestNumber()).isEqualTo(42L);
        assertThat(task.getPrMergedAt()).isNotNull();
        // Completion condition: merged PR moves the task to the Done column.
        assertThat(task.getColumnId()).isEqualTo("col-done");
        verify(activityService).record(eq("owner-1"), eq("p1"), eq(ActivityType.PR_MERGED),
                anyString(), anyString(), any());
        verify(activityService).record(eq("owner-1"), eq("p1"), eq(ActivityType.TASK_COMPLETED),
                anyString(), anyString(), any());
        verify(notificationService).createNotification(eq("member-1"), eq("PR_MERGED"), anyString(),
                anyString(), any(), anyString(), any(), anyString(), anyString(), anyString());
    }

    @Test
    void webhook_openedPr_shouldStoreMetadata_withoutCompleting() {
        stubProjectBoardAndTask();
        stubUser("member-1", "Member One");

        boardService.syncPullRequestFromEvent("task-1", new BoardService.PullRequestEvent(
                "opened", null, "member-1", 42L,
                "https://github.com/acme/skill-swapper/pull/42",
                Instant.parse("2026-08-17T09:00:00Z"), null));

        assertThat(task.getPullRequestState()).isEqualTo("OPEN");
        // Opening a PR must NOT auto-complete the task.
        assertThat(task.getColumnId()).isEqualTo("col-todo");
        verify(activityService).record(eq("member-1"), eq("p1"), eq(ActivityType.PR_OPENED),
                anyString(), anyString(), any());
        verify(activityService, never()).record(anyString(), anyString(), eq(ActivityType.TASK_COMPLETED),
                anyString(), anyString(), any());
    }

    @Test
    void webhook_review_approved_shouldSyncState_andNotifyAssignee() {
        stubProjectBoardAndTask();
        stubUser("owner-1", "Owner One");

        boardService.syncPullRequestFromEvent("task-1", new BoardService.PullRequestEvent(
                "review", "APPROVED", "owner-1", 42L,
                "https://github.com/acme/skill-swapper/pull/42",
                Instant.parse("2026-08-17T09:00:00Z"), null));

        assertThat(task.getPullRequestState()).isEqualTo("APPROVED");
        verify(activityService).record(eq("owner-1"), eq("p1"), eq(ActivityType.PR_APPROVED),
                anyString(), anyString(), any());
        verify(notificationService).createNotification(eq("member-1"), eq("PR_APPROVED"), anyString(),
                anyString(), any(), anyString(), any(), anyString(), anyString(), anyString());
    }

    @Test
    void webhook_synchronize_shouldRecordUpdate_onlyWhenOpen() {
        stubProjectBoardAndTask();
        task.setPullRequestState("OPEN");
        task.setPullRequestNumber(42L);

        boardService.syncPullRequestFromEvent("task-1", new BoardService.PullRequestEvent(
                "synchronize", null, "member-1", 42L,
                "https://github.com/acme/skill-swapper/pull/42",
                Instant.parse("2026-08-17T09:00:00Z"), null));

        verify(activityService).record(eq("member-1"), eq("p1"), eq(ActivityType.PR_UPDATED),
                anyString(), anyString(), any());
    }
}
