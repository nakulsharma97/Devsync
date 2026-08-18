package com.devsync.kanban;

import com.devsync.activity.ActivityService;
import com.devsync.activity.entity.ActivityType;
import com.devsync.common.ResourceNotFoundException;
import com.devsync.github.GitHubClient;
import com.devsync.github.GitHubException;
import com.devsync.github.GitHubIntegrationService;
import com.devsync.github.dto.GitHubPullRequestDto;
import com.devsync.github.entity.ProjectGitHubLink;
import com.devsync.github.repository.ProjectGitHubLinkRepository;
import com.devsync.kanban.dto.BoardResponse;
import com.devsync.kanban.dto.CreateTaskRequest;
import com.devsync.kanban.dto.UpdateTaskPositionRequest;
import com.devsync.kanban.entity.Board;
import com.devsync.kanban.entity.BoardColumn;
import com.devsync.kanban.entity.Task;
import com.devsync.kanban.entity.TaskDependency;
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
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BoardService {

    private final BoardRepository boardRepository;
    private final BoardColumnRepository columnRepository;
    private final TaskRepository taskRepository;
    private final TaskDependencyRepository dependencyRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ActivityService activityService;
    private final NotificationService notificationService;
    private final GitHubClient githubClient;
    private final GitHubIntegrationService githubIntegrationService;
    private final ProjectGitHubLinkRepository githubLinkRepository;

    /**
     * Read access to a board. The board must belong to a project the caller can
     * view (owner, platform admin, or any project member including VIEWER).
     */
    public BoardResponse getBoard(String boardId, String userId) {
        verifyBoardReadAccess(boardId, userId);
        return toResponse(findBoard(boardId));
    }

    /**
     * Read access to a project's board by project id — never trust the path
     * parameter alone; the caller must be able to view the project.
     */
    public BoardResponse getProjectBoard(String projectId, String userId) {
        Project project = findProject(projectId);
        if (!canViewProject(project, userId)) {
            throw new AccessDeniedException("You are not a member of this project");
        }
        List<Board> boards = boardRepository.findByProjectId(projectId);
        return boards.isEmpty() ? null : toResponse(boards.get(0));
    }

    @Transactional
    public BoardResponse createBoard(String name, String projectId, String createdBy, List<String> columnNames) {
        verifyProjectWriteAccess(projectId, createdBy);
        Board board = boardRepository.save(Board.builder()
                .name(name).projectId(projectId).createdBy(createdBy).build());
        for (int i = 0; i < columnNames.size(); i++) {
            columnRepository.save(BoardColumn.builder()
                    .boardId(board.getId()).name(columnNames.get(i)).position(i).build());
        }
        return toResponse(board);
    }

    @Transactional
    public BoardResponse.TaskDto createTask(CreateTaskRequest request, String userId) {
        String boardId = getBoardIdFromColumn(request.getColumnId());
        verifyBoardWriteAccess(boardId, userId);
        String projectId = projectIdOfBoard(boardId);

        // The assignee must exist and be an active member of the same project —
        // never a user from another project, a non-member, or a deleted/blocked
        // account.
        verifyAssignee(request.getAssigneeId(), projectId);

        int nextPosition = taskRepository.findMaxPositionByColumnId(request.getColumnId()).orElse(-1) + 1;
        Task task = taskRepository.save(Task.builder()
                .title(request.getTitle()).description(request.getDescription())
                .columnId(request.getColumnId())
                .boardId(boardId)
                .position(nextPosition)
                .assigneeId(request.getAssigneeId())
                .priority(request.getPriority() != null ? Task.Priority.valueOf(request.getPriority()) : Task.Priority.MEDIUM)
                .dueDate(request.getDueDate()).labels(request.getLabels())
                .milestone(request.getMilestone()).sprint(request.getSprint())
                .build());
        activityService.record(userId, projectId, ActivityType.TASK_CREATED,
                "Task created", task.getTitle(), null);
        if (request.getAssigneeId() != null && !request.getAssigneeId().equals(userId)) {
            activityService.record(userId, projectId, ActivityType.TASK_ASSIGNED,
                    "Task assigned", task.getTitle(), null);
            notifyAssigned(projectId, task.getId(), task.getTitle(), userId, request.getAssigneeId());
        }
        return toTaskDto(task);
    }

    @Transactional
    public void updateTaskPosition(UpdateTaskPositionRequest request, String userId) {
        Task task = taskRepository.findById(request.getTaskId())
                .orElseThrow(() -> new ResourceNotFoundException("Task", request.getTaskId()));
        verifyBoardWriteAccess(task.getBoardId(), userId);

        // The destination column must belong to the SAME board — otherwise a
        // task could be moved into another project's board by column id.
        BoardColumn newColumn = columnRepository.findById(request.getNewColumnId())
                .orElseThrow(() -> new ResourceNotFoundException("BoardColumn", request.getNewColumnId()));
        if (!newColumn.getBoardId().equals(task.getBoardId())) {
            throw new IllegalArgumentException("Task cannot be moved to a column in another board");
        }

        String oldColumnId = task.getColumnId();
        task.setColumnId(request.getNewColumnId());
        task.setPosition(request.getNewPosition());
        taskRepository.save(task);
        if (!oldColumnId.equals(request.getNewColumnId())) reorderColumn(oldColumnId);
        reorderColumn(request.getNewColumnId());

        String projectId = projectIdOfBoard(task.getBoardId());
        String columnName = columnRepository.findById(request.getNewColumnId())
                .map(BoardColumn::getName).orElse("");
        ActivityType type = isDoneColumn(columnName) ? ActivityType.TASK_COMPLETED : ActivityType.TASK_MOVED;
        activityService.record(userId, projectId, type,
                type == ActivityType.TASK_COMPLETED ? "Task completed" : "Task moved",
                task.getTitle(), null);
    }

    @Transactional
    public Task updateTask(String taskId, CreateTaskRequest request, String userId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task", taskId));
        verifyBoardWriteAccess(task.getBoardId(), userId);
        String projectId = projectIdOfBoard(task.getBoardId());
        String oldAssigneeId = task.getAssigneeId();

        if (request.getAssigneeId() != null && !request.getAssigneeId().equals(oldAssigneeId)) {
            // Assignment change: the new assignee must be a valid project member.
            verifyAssignee(request.getAssigneeId(), projectId);
        }
        if (request.getTitle() != null) task.setTitle(request.getTitle());
        if (request.getDescription() != null) task.setDescription(request.getDescription());
        if (request.getAssigneeId() != null) task.setAssigneeId(request.getAssigneeId());
        if (request.getPriority() != null) task.setPriority(Task.Priority.valueOf(request.getPriority()));
        if (Boolean.TRUE.equals(request.getClearDueDate())) {
            // Explicitly removing the due date (e.g. cleared in the UI) — the
            // task must disappear from the calendar.
            task.setDueDate(null);
        } else if (request.getDueDate() != null) {
            task.setDueDate(request.getDueDate());
        }
        if (request.getLabels() != null) task.setLabels(request.getLabels());
        if (request.getMilestone() != null) task.setMilestone(request.getMilestone());
        if (request.getSprint() != null) task.setSprint(request.getSprint());
        task = taskRepository.save(task);
        activityService.record(userId, projectId, ActivityType.TASK_UPDATED,
                "Task updated", task.getTitle(), null);

        // Notify only on an actual assignment change — never on unrelated edits
        // that keep the same assignee (no duplicate notifications).
        String newAssigneeId = task.getAssigneeId();
        if (newAssigneeId != null && !newAssigneeId.equals(oldAssigneeId) && !newAssigneeId.equals(userId)) {
            activityService.record(userId, projectId, ActivityType.TASK_ASSIGNED,
                    "Task assigned", task.getTitle(), null);
            notifyAssigned(projectId, task.getId(), task.getTitle(), userId, newAssigneeId);
        }
        return task;
    }

    @Transactional
    public void deleteTask(String taskId, String userId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task", taskId));
        verifyBoardWriteAccess(task.getBoardId(), userId);
        String projectId = projectIdOfBoard(task.getBoardId());
        taskRepository.deleteById(taskId);
        activityService.record(userId, projectId, ActivityType.TASK_DELETED,
                "Task deleted", task.getTitle(), null);
    }

    // ── GitHub-based development workflow ─────────────────────────────

    /**
     * Starts work on a task: suggests a deterministic feature branch name and
     * records when work began. A task already assigned to someone else cannot
     * be started by another member (they get a clear message instead of a
     * silently conflicting branch). Idempotent for the assignee.
     */
    @Transactional
    public BoardResponse.TaskDto startTask(String taskId, String userId) {
        Task task = requireTask(taskId);
        Project project = requireWorkflowAccess(task, userId);
        requireAssignable(task, project, userId);
        if (task.getStartedAt() != null) {
            return toTaskDto(task); // already started — nothing to do
        }

        String branch = task.getBranchName();
        if (branch == null) {
            branch = suggestBranchName(task);
            task.setBranchName(branch);
        }
        task.setStartedAt(Instant.now());
        taskRepository.save(task);

        String projectId = project.getId();
        activityService.record(userId, projectId, ActivityType.TASK_STARTED,
                "Task started", task.getTitle(), null);
        activityService.record(userId, projectId, ActivityType.BRANCH_CREATED,
                "Branch suggested", branch, null);

        // TO DO → IN PROGRESS when work starts.
        moveToColumnIfMatching(task, c -> isToDoColumn(c), c -> isInProgressColumn(c), 1);

        notifyUser(project.getOwnerId(), "TASK_STARTED", "Task started",
                actorName(userId) + " started working on \"" + task.getTitle() + "\"",
                userId, task.getTitle(), "task", "/board/" + projectId);
        return toTaskDto(task);
    }

    /**
     * Creates the feature branch on GitHub with the member's own token (they
     * must have push access — GitHub enforces that). Members can never branch
     * from or push to main through DevSync: the branch is forked from the
     * repo's default branch and must be a feature branch.
     */
    @Transactional
    public BoardResponse.TaskDto createBranch(String taskId, String userId, String requestedBranch) {
        Task task = requireTask(taskId);
        Project project = requireWorkflowAccess(task, userId);
        requireAssignable(task, project, userId);
        ProjectGitHubLink link = linkedRepo(project);

        String branch = requestedBranch != null && !requestedBranch.isBlank()
                ? requestedBranch.trim() : task.getBranchName();
        if (branch == null || branch.isBlank()) branch = suggestBranchName(task);
        validateBranchName(branch);

        String token = githubIntegrationService.tokenFor(userId);
        String owner = ownerOf(link);
        String repo = nameOf(link);
        githubClient.createBranch(token, owner, repo, branch, link.getRepoDefaultBranch());

        task.setBranchName(branch);
        if (task.getStartedAt() == null) task.setStartedAt(Instant.now());
        taskRepository.save(task);

        String projectId = project.getId();
        activityService.record(userId, projectId, ActivityType.BRANCH_CREATED,
                "Branch created", branch, null);
        notifyUser(project.getOwnerId(), "BRANCH_CREATED", "Branch created",
                actorName(userId) + " created branch " + branch + " for \"" + task.getTitle() + "\"",
                userId, branch, "branch", "/board/" + projectId);
        return toTaskDto(task);
    }

    /**
     * Opens a real pull request on GitHub (branch → default branch). The PR
     * metadata is stored on the task and stays in sync with GitHub state.
     */
    @Transactional
    public BoardResponse.TaskDto createPullRequest(String taskId, String userId, String title, String description) {
        Task task = requireTask(taskId);
        Project project = requireWorkflowAccess(task, userId);
        requireAssignable(task, project, userId);
        if (task.getBranchName() == null || task.getBranchName().isBlank()) {
            throw new IllegalArgumentException("Start the task or create a branch before opening a pull request");
        }
        ProjectGitHubLink link = linkedRepo(project);

        String token = githubIntegrationService.tokenFor(userId);
        String owner = ownerOf(link);
        String repo = nameOf(link);
        GitHubPullRequestDto pr = githubClient.createPullRequest(token, owner, repo,
                title != null && !title.isBlank() ? title : task.getTitle(),
                task.getBranchName(), link.getRepoDefaultBranch(), description);

        String projectId = project.getId();
        task.setPullRequestNumber(pr.getNumber());
        task.setPullRequestUrl(pr.getHtmlUrl());
        task.setPullRequestState("OPEN");
        task.setPrCreatedAt(pr.getCreatedAt());
        taskRepository.save(task);

        activityService.record(userId, projectId, ActivityType.PR_OPENED,
                "Pull request opened", "PR #" + pr.getNumber() + " for " + task.getTitle(), null);
        notifyUser(project.getOwnerId(), "PR_OPENED", "Pull request opened",
                actorName(userId) + " opened Pull Request #" + pr.getNumber() + " for \"" + task.getTitle() + "\"",
                userId, String.valueOf(pr.getNumber()), "pr", "/board/" + projectId);
        return toTaskDto(task);
    }

    /**
     * Re-reads the real PR state from GitHub (merged / closed / latest review)
     * and applies it to the task. Any member of the project may refresh.
     */
    @Transactional
    public BoardResponse.TaskDto refreshPullRequest(String taskId, String userId) {
        Task task = requireTask(taskId);
        Project project = requireWorkflowReadAccess(task, userId);
        requirePullRequest(task);
        ProjectGitHubLink link = linkedRepo(project);

        String token = githubIntegrationService.tokenFor(userId);
        GitHubPullRequestDto pr = githubClient.fetchPullRequest(token, ownerOf(link), nameOf(link),
                task.getPullRequestNumber());
        applyPullRequestState(task, derivePrState(pr,
                githubClient.fetchReviewStates(token, ownerOf(link), nameOf(link), pr.getNumber())),
                userId, pr.getNumber(), pr.getHtmlUrl(), pr.getCreatedAt(), pr.getMergedAt());
        return toTaskDto(task);
    }

    /** Approves the linked PR on GitHub (owner/maintainer only). */
    @Transactional
    public BoardResponse.TaskDto approvePullRequest(String taskId, String userId, String comment) {
        Task task = requireTask(taskId);
        Project project = requireWorkflowAccess(task, userId);
        requireMaintainer(project, userId);
        requirePullRequest(task);
        ProjectGitHubLink link = linkedRepo(project);
        String token = githubIntegrationService.tokenFor(userId);
        githubClient.submitReview(token, ownerOf(link), nameOf(link), task.getPullRequestNumber(),
                "APPROVE", comment);
        return refreshPullRequest(taskId, userId);
    }

    /** Requests changes on the linked PR on GitHub (owner/maintainer only). */
    @Transactional
    public BoardResponse.TaskDto requestChanges(String taskId, String userId, String comment) {
        Task task = requireTask(taskId);
        Project project = requireWorkflowAccess(task, userId);
        requireMaintainer(project, userId);
        requirePullRequest(task);
        ProjectGitHubLink link = linkedRepo(project);
        String token = githubIntegrationService.tokenFor(userId);
        githubClient.submitReview(token, ownerOf(link), nameOf(link), task.getPullRequestNumber(),
                "REQUEST_CHANGES", comment);
        return refreshPullRequest(taskId, userId);
    }

    /**
     * Merges the linked PR into main on GitHub. An explicit, authorized action:
     * a merged PR marks the task DONE (the completion condition).
     */
    @Transactional
    public BoardResponse.TaskDto mergePullRequest(String taskId, String userId) {
        Task task = requireTask(taskId);
        Project project = requireWorkflowAccess(task, userId);
        requireMaintainer(project, userId);
        requirePullRequest(task);
        ProjectGitHubLink link = linkedRepo(project);
        String token = githubIntegrationService.tokenFor(userId);
        githubClient.mergePullRequest(token, ownerOf(link), nameOf(link), task.getPullRequestNumber());
        return refreshPullRequest(taskId, userId);
    }

    /**
     * System entry point for GitHub webhooks (pull_request / pull_request_review
     * events). No user session — the webhook service resolves the task and the
     * acting user before calling this. Keeps the task in sync with the real
     * GitHub state and completes the task when its PR merges.
     */
    @Transactional
    public void syncPullRequestFromEvent(String taskId, PullRequestEvent event) {
        Task task = requireTask(taskId);
        switch (event.action()) {
            case "opened" -> applyPullRequestState(task, "OPEN", event.actorUserId(),
                    event.number(), event.url(), event.createdAt(), event.mergedAt());
            case "synchronize" -> {
                // Branch updated — still open; record the update only.
                if (task.getPullRequestState() == null || !isTerminal(task.getPullRequestState())) {
                    activityService.record(actorIdFor(event), projectIdOfBoard(task.getBoardId()),
                            ActivityType.PR_UPDATED, "Pull request updated", "PR #" + event.number(), null);
                }
            }
            case "closed" -> {
                String state = event.mergedAt() != null ? "MERGED" : "CLOSED";
                applyPullRequestState(task, state, event.actorUserId(),
                        event.number(), event.url(), event.createdAt(), event.mergedAt());
            }
            case "review" -> {
                String reviewState = "APPROVED".equals(event.reviewState()) ? "APPROVED" : "CHANGES_REQUESTED";
                applyPullRequestState(task, reviewState, event.actorUserId(),
                        event.number(), event.url(), event.createdAt(), event.mergedAt());
            }
            default -> { /* unknown event — acknowledged but ignored */ }
        }
    }

    /** GitHub webhook event payload for {@link #syncPullRequestFromEvent}. */
    public record PullRequestEvent(String action, String reviewState, String actorUserId,
                                   Long number, String url, Instant createdAt, Instant mergedAt) {}

    // ── workflow helpers ────────────────────────────────────

    /**
     * Applies a real PR state to the task. On state transitions it records the
     * matching activity and notifications; a MERGED PR moves the task to the
     * Done column and completes it (never auto-completes on mere PR open).
     */
    private void applyPullRequestState(Task task, String newState, String actorUserId,
                                       Long number, String url, Instant createdAt, Instant mergedAt) {
        String oldState = task.getPullRequestState();
        task.setPullRequestNumber(number);
        task.setPullRequestUrl(url);
        task.setPrCreatedAt(createdAt);
        task.setPrMergedAt(mergedAt);
        task.setPullRequestState(newState);
        taskRepository.save(task);
        if (oldState != null && oldState.equals(newState)) return;

        String projectId = projectIdOfBoard(task.getBoardId());
        String prLabel = number != null ? "PR #" + number : "PR";
        String actor = actorIdFor(actorUserId);
        String actorName = actorName(actor);
        switch (newState) {
            case "OPEN" -> {
                activityService.record(actor, projectId, ActivityType.PR_OPENED,
                        "Pull request opened", prLabel + " for " + task.getTitle(), null);
                notifyUser(projectOwnerId(projectId), "PR_OPENED", "Pull request opened",
                        actorName + " opened " + prLabel + " for \"" + task.getTitle() + "\"",
                        actor, prLabel, "pr", "/board/" + projectId);
            }
            case "APPROVED" -> {
                activityService.record(actor, projectId, ActivityType.PR_APPROVED,
                        "Pull request approved", prLabel + " for " + task.getTitle(), null);
                notifyUser(task.getAssigneeId(), "PR_APPROVED", "Pull request approved",
                        prLabel + " for \"" + task.getTitle() + "\" was approved",
                        actor, prLabel, "pr", "/board/" + projectId);
            }
            case "CHANGES_REQUESTED" -> {
                activityService.record(actor, projectId, ActivityType.PR_CHANGES_REQUESTED,
                        "Changes requested", prLabel + " for " + task.getTitle(), null);
                notifyUser(task.getAssigneeId(), "PR_CHANGES_REQUESTED", "Changes requested",
                        "Changes were requested on " + prLabel + " for \"" + task.getTitle() + "\"",
                        actor, prLabel, "pr", "/board/" + projectId);
            }
            case "MERGED" -> {
                task.setPrMergedAt(mergedAt);
                taskRepository.save(task);
                activityService.record(actor, projectId, ActivityType.PR_MERGED,
                        "Pull request merged", prLabel + " for " + task.getTitle(), null);
                activityService.record(actor, projectId, ActivityType.TASK_COMPLETED,
                        "Task completed", task.getTitle(), null);
                moveToColumnIfMatching(task, c -> true, c -> isDoneColumn(c), -1);
                notifyUser(task.getAssigneeId(), "PR_MERGED", "Pull request merged",
                        prLabel + " for \"" + task.getTitle() + "\" was merged — task completed",
                        actor, prLabel, "pr", "/board/" + projectId);
            }
            case "CLOSED" -> {
                activityService.record(actor, projectId, ActivityType.PR_CLOSED,
                        "Pull request closed", prLabel + " for " + task.getTitle(), null);
                notifyUser(task.getAssigneeId(), "PR_CLOSED", "Pull request closed",
                        prLabel + " for \"" + task.getTitle() + "\" was closed without merging",
                        actor, prLabel, "pr", "/board/" + projectId);
            }
            default -> { }
        }
    }

    private boolean isTerminal(String state) {
        return "MERGED".equals(state) || "CLOSED".equals(state);
    }

    private void requirePullRequest(Task task) {
        if (task.getPullRequestNumber() == null) {
            throw new IllegalArgumentException("No pull request exists for this task yet — create one first");
        }
    }

    private Task requireTask(String taskId) {
        return taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task", taskId));
    }

    /**
     * Work access: member (not VIEWER) of an editable project. Viewers cannot
     * start tasks, create branches or open PRs.
     */
    private Project requireWorkflowAccess(Task task, String userId) {
        Project project = projectOf(task);
        ensureProjectEditable(project);
        if (project.getOwnerId().equals(userId)) return project;
        var user = userRepository.findById(userId).orElse(null);
        if (user != null && user.getRole() == User.Role.ADMIN) return project;
        ProjectMember member = projectMemberRepository.findByProjectIdAndUserId(project.getId(), userId)
                .orElseThrow(() -> new AccessDeniedException("You are not a member of this project"));
        if (member.getRole() == ProjectMember.Role.VIEWER) {
            throw new AccessDeniedException("Viewers cannot work on tasks in this project");
        }
        return project;
    }

    /** Read access for status refresh: any member (including VIEWER). */
    private Project requireWorkflowReadAccess(Task task, String userId) {
        Project project = projectOf(task);
        if (project.getOwnerId().equals(userId)) return project;
        var user = userRepository.findById(userId).orElse(null);
        if (user != null && user.getRole() == User.Role.ADMIN) return project;
        if (!projectMemberRepository.existsByProjectIdAndUserId(project.getId(), userId)) {
            throw new AccessDeniedException("You are not a member of this project");
        }
        return project;
    }

    /** Owner (or project/platform admin) gate for review + merge actions. */
    private void requireMaintainer(Project project, String userId) {
        if (project.getOwnerId().equals(userId)) return;
        var user = userRepository.findById(userId).orElse(null);
        if (user != null && user.getRole() == User.Role.ADMIN) return;
        boolean adminMember = projectMemberRepository
                .findByProjectIdAndUserId(project.getId(), userId)
                .map(m -> m.getRole() == ProjectMember.Role.ADMIN).orElse(false);
        if (!adminMember) {
            throw new AccessDeniedException("Only the project owner or an admin can review or merge pull requests");
        }
    }

    /**
     * A task assigned to someone else cannot be claimed by another member —
     * they get a clear message instead of conflicting branches. Owners and
     * admins may still act (reassignment is the owner's call).
     */
    private void requireAssignable(Task task, Project project, String userId) {
        if (task.getAssigneeId() == null || task.getAssigneeId().equals(userId)) return;
        boolean maintainer = project.getOwnerId().equals(userId)
                || (userRepository.findById(userId).map(u -> u.getRole() == User.Role.ADMIN).orElse(false))
                || projectMemberRepository.findByProjectIdAndUserId(project.getId(), userId)
                        .map(m -> m.getRole() == ProjectMember.Role.ADMIN).orElse(false);
        if (!maintainer) {
            String assigneeName = userRepository.findById(task.getAssigneeId())
                    .map(User::getFullName).orElse("someone else");
            throw new IllegalArgumentException("This task is already assigned to " + assigneeName);
        }
    }

    private ProjectGitHubLink linkedRepo(Project project) {
        return githubLinkRepository.findByProjectId(project.getId())
                .orElseThrow(() -> new GitHubException(
                        "No GitHub repository is linked to this project — an owner must link one first"));
    }

    private Project projectOf(Task task) {
        return findProject(projectIdOfBoard(task.getBoardId()));
    }

    private String projectOwnerId(String projectId) {
        return findProject(projectId).getOwnerId();
    }

    private String ownerOf(ProjectGitHubLink link) {
        return link.getRepoFullName().split("/")[0];
    }

    private String nameOf(ProjectGitHubLink link) {
        return link.getRepoFullName().split("/")[1];
    }

    private String actorIdFor(String userId) {
        return (userId == null || userId.isBlank()) ? "github" : userId;
    }

    private String actorIdFor(PullRequestEvent event) {
        return actorIdFor(event.actorUserId());
    }

    private String actorName(String userId) {
        if (userId == null || userId.isBlank() || "github".equals(userId)) return "GitHub";
        return userRepository.findById(userId).map(User::getFullName).orElse("A team member");
    }

    /**
     * Notification with the caller skipped: never notify the actor about their
     * own action, and never notify a null recipient.
     */
    private void notifyUser(String recipientId, String type, String title, String message,
                            String actorId, String referenceId, String referenceType, String actionUrl) {
        if (recipientId == null || recipientId.isBlank()) return;
        if (actorId != null && actorId.equals(recipientId)) return;
        User actor = userRepository.findById(actorId).orElse(null);
        String actorName = actor != null ? actor.getFullName() : "GitHub";
        String avatar = actor != null ? actor.getAvatarUrl() : null;
        notificationService.createNotification(recipientId, type, title, message,
                actorId, actorName, avatar, referenceId, referenceType, actionUrl);
    }

    private String suggestBranchName(Task task) {
        String slug = task.getTitle().toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-+|-+$)", "");
        if (slug.length() > 40) slug = slug.substring(0, 40).replaceAll("-+$", "");
        if (slug.isBlank()) slug = "task";
        String prefix = slug.startsWith("fix") ? "fix" : "feature";
        String suffix = task.getId().replace("-", "");
        suffix = suffix.substring(0, Math.min(8, suffix.length()));
        return prefix + "/" + slug + "-" + suffix;
    }

    private void validateBranchName(String branch) {
        if (!branch.matches("[a-z0-9._/-]+")) {
            throw new IllegalArgumentException(
                    "Branch name must contain only lowercase letters, numbers, hyphens, underscores, dots and slashes");
        }
        if (branch.equals("main") || branch.equals("master")) {
            throw new IllegalArgumentException(
                    "Directly modifying the main branch is not allowed — create a feature branch instead");
        }
    }

    /**
     * Moves the task to the first column matching {@code target} when its
     * current column matches {@code from}; {@code fallbackIndex} (-1 = last) is
     * used when no column name matches. No-op when already in the target column.
     */
    private void moveToColumnIfMatching(Task task, java.util.function.Predicate<String> from,
                                        java.util.function.Predicate<String> target, int fallbackIndex) {
        List<BoardColumn> columns = columnRepository.findByBoardIdOrderByPositionAsc(task.getBoardId());
        if (columns.isEmpty()) return;
        String currentName = columnRepository.findById(task.getColumnId())
                .map(BoardColumn::getName).orElse("");
        if (from.test(currentName)) {
            String targetId = columns.stream()
                    .filter(c -> target.test(c.getName()))
                    .map(BoardColumn::getId)
                    .findFirst()
                    .orElseGet(() -> fallbackIndex >= 0
                            ? columns.get(Math.min(fallbackIndex, columns.size() - 1)).getId()
                            : columns.get(columns.size() - 1).getId());
            if (!targetId.equals(task.getColumnId())) {
                String oldColumnId = task.getColumnId();
                int next = taskRepository.findMaxPositionByColumnId(targetId).orElse(-1) + 1;
                task.setColumnId(targetId);
                task.setPosition(next);
                taskRepository.save(task);
                reorderColumn(oldColumnId);
                reorderColumn(targetId);
            }
        }
    }

    private boolean isToDoColumn(String name) {
        String n = name == null ? "" : name.toLowerCase();
        return n.contains("to do") || n.contains("todo") || n.contains("backlog") || n.contains("open");
    }

    private boolean isInProgressColumn(String name) {
        String n = name == null ? "" : name.toLowerCase();
        return n.contains("progress") || n.contains("doing");
    }

    private boolean isDoneColumn(String name) {
        String n = name == null ? "" : name.toLowerCase();
        return n.contains("done") || n.contains("complete");
    }

    /** Derives the DevSync PR state from real GitHub data (merge > close > review). */
    private String derivePrState(GitHubPullRequestDto pr, List<String> reviewStates) {
        if (pr.getMergedAt() != null) return "MERGED";
        if ("closed".equals(pr.getState())) return "CLOSED";
        if (!reviewStates.isEmpty()) {
            String latest = reviewStates.get(reviewStates.size() - 1);
            if ("APPROVED".equals(latest)) return "APPROVED";
            if ("CHANGES_REQUESTED".equals(latest)) return "CHANGES_REQUESTED";
        }
        return "OPEN";
    }

    // ── Task dependencies (blocked-by graph) ───────────────────────────

    /**
     * Adds {@code taskId} → {@code dependsOnId}. Both tasks must exist in the
     * SAME board (cross-project dependencies are rejected) and the graph must
     * stay acyclic — adding a dependency that would create a cycle is refused.
     */
    @Transactional
    public void addDependency(String taskId, String dependsOnId, String userId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task", taskId));
        verifyBoardWriteAccess(task.getBoardId(), userId);
        Task dependsOn = taskRepository.findById(dependsOnId)
                .orElseThrow(() -> new ResourceNotFoundException("Task", dependsOnId));
        if (taskId.equals(dependsOnId)) {
            throw new IllegalArgumentException("A task cannot depend on itself");
        }
        if (!dependsOn.getBoardId().equals(task.getBoardId())) {
            throw new IllegalArgumentException("Tasks from different boards cannot depend on each other");
        }
        if (dependencyRepository.existsByTaskIdAndDependsOnId(taskId, dependsOnId)) {
            return; // idempotent
        }
        // Cycle check: follow depends-on edges from dependsOnId — if we reach
        // taskId, this edge would close a loop.
        Deque<String> queue = new ArrayDeque<>();
        Set<String> seen = new HashSet<>();
        queue.add(dependsOnId);
        while (!queue.isEmpty()) {
            String current = queue.poll();
            if (current.equals(taskId)) {
                throw new IllegalArgumentException("This dependency would create a cycle");
            }
            for (TaskDependency dep : dependencyRepository.findByTaskId(current)) {
                if (seen.add(dep.getDependsOnId())) queue.add(dep.getDependsOnId());
            }
        }
        dependencyRepository.save(TaskDependency.builder()
                .taskId(taskId).dependsOnId(dependsOnId).build());
    }

    @Transactional
    public void removeDependency(String taskId, String dependsOnId, String userId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task", taskId));
        verifyBoardWriteAccess(task.getBoardId(), userId);
        dependencyRepository.findByTaskIdAndDependsOnId(taskId, dependsOnId)
                .ifPresent(dependencyRepository::delete);
    }

    /**
     * Calendar feed: tasks with a due date inside [from, to] for projects the
     * user can see (owned, member, or platform admin). Window capped at 366 days.
     */
    @Transactional(readOnly = true)
    public List<BoardResponse.TaskDto> getCalendarTasks(Instant from, Instant to, String userId) {
        validateCalendarWindow(from, to);

        var user = userRepository.findById(userId).orElse(null);
        if (user != null && user.getRole() == com.devsync.user.entity.User.Role.ADMIN) {
            return toCalendarDtos(taskRepository.findByDueDateBetweenOrderByDueDateAsc(from, to));
        }

        Set<String> projectIds = new HashSet<>();
        projectRepository.findByOwnerId(userId).forEach(p -> projectIds.add(p.getId()));
        projectRepository.findProjectsByUserId(userId).forEach(p -> projectIds.add(p.getId()));
        if (projectIds.isEmpty()) return List.of();

        List<String> boardIds = boardRepository.findByProjectIdIn(projectIds).stream()
                .map(Board::getId).toList();
        if (boardIds.isEmpty()) return List.of();
        return toCalendarDtos(taskRepository.findByDueDateBetweenAndBoardIdInOrderByDueDateAsc(from, to, boardIds));
    }

    /**
     * Project-scoped calendar feed: only tasks whose boards belong to the given
     * project are returned, so different projects can never leak into each
     * other's calendars. Enforces membership — non-members get access denied.
     */
    @Transactional(readOnly = true)
    public List<BoardResponse.TaskDto> getProjectCalendarTasks(String projectId, Instant from, Instant to,
                                                               String userId) {
        validateCalendarWindow(from, to);
        Project project = findProject(projectId);
        if (!canViewProject(project, userId)) {
            throw new AccessDeniedException("You are not a member of this project");
        }
        List<String> boardIds = boardRepository.findByProjectId(projectId).stream()
                .map(Board::getId).toList();
        if (boardIds.isEmpty()) return List.of();
        return toCalendarDtos(taskRepository.findByDueDateBetweenAndBoardIdInOrderByDueDateAsc(from, to, boardIds));
    }

    private void validateCalendarWindow(Instant from, Instant to) {
        if (from == null || to == null) {
            throw new IllegalArgumentException("from and to are required");
        }
        if (from.isAfter(to)) {
            throw new IllegalArgumentException("from must not be after to");
        }
        if (Duration.between(from, to).toDays() > 366) {
            throw new IllegalArgumentException("Date range too large (max 366 days)");
        }
    }

    /** Maps tasks to DTOs, resolving each task's column name in one batch query. */
    private List<BoardResponse.TaskDto> toCalendarDtos(List<Task> tasks) {
        if (tasks.isEmpty()) return List.of();
        Map<String, String> columnNames = columnRepository.findAllById(
                        tasks.stream().map(Task::getColumnId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(BoardColumn::getId, BoardColumn::getName, (a, b) -> a));
        return tasks.stream().map(task -> {
            BoardResponse.TaskDto dto = toTaskDto(task);
            dto.setColumnName(columnNames.get(task.getColumnId()));
            return dto;
        }).toList();
    }

    @Transactional(readOnly = true)
    public Page<BoardResponse.TaskDto> filterTasks(String projectId, String priority, String label,
                                                   String status, String keyword, int page, int size,
                                                   String userId) {
        Project project = findProject(projectId);
        if (!canViewProject(project, userId)) {
            throw new AccessDeniedException("You are not a member of this project");
        }
        // Validate input first — an invalid filter must be rejected even when the
        // project has no boards yet.
        Task.Priority prio = null;
        if (priority != null && !priority.isBlank()) {
            try {
                prio = Task.Priority.valueOf(priority.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid priority (LOW, MEDIUM, HIGH, CRITICAL)");
            }
        }
        String lbl = (label == null || label.isBlank()) ? null : label.trim();
        String st = (status == null || status.isBlank()) ? null : status.trim();
        String kw = (keyword == null || keyword.isBlank()) ? null : keyword.trim();
        List<String> boardIds = boardRepository.findByProjectId(projectId).stream()
                .map(Board::getId).toList();
        if (boardIds.isEmpty()) {
            return Page.empty();
        }
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        return taskRepository.findFilteredTasks(boardIds, prio, lbl, st, kw, pageable).map(this::toTaskDto);
    }

    private boolean canViewProject(Project project, String userId) {
        if (project.getOwnerId().equals(userId)) return true;
        var user = userRepository.findById(userId).orElse(null);
        if (user != null && user.getRole() == com.devsync.user.entity.User.Role.ADMIN) return true;
        return projectMemberRepository.existsByProjectIdAndUserId(project.getId(), userId);
    }

    /**
     * A single task DTO after an update — the response for PUT /tasks/{id}.
     * Read access is verified against the task's board.
     */
    @Transactional(readOnly = true)
    public BoardResponse.TaskDto getTaskDto(String taskId, String userId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task", taskId));
        verifyBoardReadAccess(task.getBoardId(), userId);
        return toTaskDto(task);
    }

    /**
     * Assignment rules: the assignee must exist and be an active member of the
     * same project. Deleted, blocked and unknown users are rejected; users from
     * another project (non-members) get 403. A null/blank assignee means
     * "unassigned" and is always allowed.
     */
    private void verifyAssignee(String assigneeId, String projectId) {
        if (assigneeId == null || assigneeId.isBlank()) return;
        User assignee = userRepository.findById(assigneeId)
                .orElseThrow(() -> new IllegalArgumentException("Assignee not found"));
        if (assignee.isDeleted()) {
            throw new IllegalArgumentException("Cannot assign a task to a deleted user");
        }
        if (assignee.isBlocked()) {
            throw new IllegalArgumentException("Cannot assign a task to a blocked user");
        }
        Project project = findProject(projectId);
        boolean isMember = project.getOwnerId().equals(assigneeId)
                || projectMemberRepository.existsByProjectIdAndUserId(projectId, assigneeId);
        if (!isMember) {
            throw new AccessDeniedException("Assignee is not a member of this project");
        }
    }

    /**
     * Notifies the assignee through the existing notification system. The
     * caller only reaches this point after a genuine assignment change, so no
     * duplicate notification is emitted for unchanged assignments.
     */
    private void notifyAssigned(String projectId, String taskId, String taskTitle,
                                String actorId, String assigneeId) {
        Project project = findProject(projectId);
        User actor = userRepository.findById(actorId).orElse(null);
        String actorName = actor != null ? actor.getFullName() : "Someone";
        notificationService.createNotification(
                assigneeId, "TASK_ASSIGNED", "Task assigned",
                actorName + " assigned you a task in " + project.getName(),
                actorId, actorName, actor != null ? actor.getAvatarUrl() : null,
                taskId, "task", "/board/" + projectId);
    }

    /**
     * Read access: project owner, platform admin, or any project member
     * (including VIEWER). Everything else is 403.
     */
    private void verifyBoardReadAccess(String boardId, String userId) {
        Project project = findProject(findBoard(boardId).getProjectId());
        if (!canViewProject(project, userId)) {
            throw new AccessDeniedException("You are not a member of this project");
        }
    }

    /**
     * Write access to a board's tasks: the project must be editable (not
     * archived/deleted) and the caller must hold a role that can modify tasks
     * (OWNER, ADMIN, MEMBER). VIEWER and non-members are 403.
     */
    private void verifyBoardWriteAccess(String boardId, String userId) {
        verifyProjectWriteAccess(findBoard(boardId).getProjectId(), userId);
    }

    /**
     * Write access by project id (used when the board may not exist yet, e.g.
     * createBoard). Archived/deleted projects reject all writes; VIEWER and
     * non-members get 403.
     */
    private void verifyProjectWriteAccess(String projectId, String userId) {
        Project project = findProject(projectId);
        ensureProjectEditable(project);
        if (project.getOwnerId().equals(userId)) return;
        ProjectMember member = projectMemberRepository.findByProjectIdAndUserId(project.getId(), userId)
                .orElseThrow(() -> new AccessDeniedException("You are not a member of this project"));
        if (member.getRole() == ProjectMember.Role.VIEWER) {
            throw new AccessDeniedException("Viewers cannot modify tasks in this project");
        }
    }

    /**
     * Archived projects become read-only: no task create/edit/move/delete.
     * Deleted (soft-deleted) projects are treated as not found.
     */
    private void ensureProjectEditable(Project project) {
        if (project.isDeleted()) {
            throw new ResourceNotFoundException("Project", project.getId());
        }
        if (project.getStatus() == Project.ProjectStatus.ARCHIVED) {
            throw new IllegalArgumentException("This project is archived and is read-only");
        }
    }

    private Board findBoard(String boardId) {
        return boardRepository.findById(boardId)
                .orElseThrow(() -> new ResourceNotFoundException("Board", boardId));
    }

    private Project findProject(String projectId) {
        return projectRepository.findById(projectId)
                .filter(p -> !p.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
    }

    private String projectIdOfBoard(String boardId) {
        return boardRepository.findById(boardId).map(Board::getProjectId).orElse(null);
    }

    private void reorderColumn(String columnId) {
        List<Task> tasks = taskRepository.findByColumnIdOrderByPositionAsc(columnId);
        for (int i = 0; i < tasks.size(); i++) tasks.get(i).setPosition(i);
        taskRepository.saveAll(tasks);
    }

    private String getBoardIdFromColumn(String columnId) {
        return columnRepository.findById(columnId)
                .orElseThrow(() -> new ResourceNotFoundException("BoardColumn", columnId)).getBoardId();
    }

    private BoardResponse toResponse(Board board) {
        List<BoardColumn> columns = columnRepository.findByBoardIdOrderByPositionAsc(board.getId());
        List<BoardResponse.ColumnDto> columnDtos = columns.stream()
                .map(col -> {
                    List<Task> tasks = taskRepository.findByColumnIdOrderByPositionAsc(col.getId());
                    // Batch-load dependencies for the whole board in one query.
                    Map<String, List<String>> deps = dependenciesFor(tasks);
                    return BoardResponse.ColumnDto.builder()
                            .id(col.getId()).name(col.getName()).position(col.getPosition()).color(col.getColor())
                            .tasks(tasks.stream().map(t -> toTaskDto(t, deps.getOrDefault(t.getId(), List.of()))).toList())
                            .build();
                })
                .toList();
        return BoardResponse.builder()
                .id(board.getId()).name(board.getName()).projectId(board.getProjectId())
                .description(board.getDescription()).columns(columnDtos)
                .createdAt(board.getCreatedAt()).build();
    }

    /** taskId → ids it depends on, in one query for a batch of tasks. */
    private Map<String, List<String>> dependenciesFor(List<Task> tasks) {
        if (tasks.isEmpty()) return Map.of();
        Set<String> taskIds = tasks.stream().map(Task::getId).collect(Collectors.toSet());
        return dependencyRepository.findByTaskIdIn(taskIds).stream()
                .collect(Collectors.groupingBy(TaskDependency::getTaskId,
                        Collectors.mapping(TaskDependency::getDependsOnId, Collectors.toList())));
    }

    private BoardResponse.TaskDto toTaskDto(Task task) {
        return toTaskDto(task, dependencyRepository.findByTaskId(task.getId()).stream()
                .map(TaskDependency::getDependsOnId).toList());
    }

    private BoardResponse.TaskDto toTaskDto(Task task, List<String> dependencies) {
        String assigneeName = null, assigneeAvatar = null;
        if (task.getAssigneeId() != null) {
            var user = userRepository.findById(task.getAssigneeId()).orElse(null);
            if (user != null) { assigneeName = user.getFullName(); assigneeAvatar = user.getAvatarUrl(); }
        }
        return BoardResponse.TaskDto.builder()
                .id(task.getId()).title(task.getTitle()).description(task.getDescription())
                .columnId(task.getColumnId()).position(task.getPosition())
                .assigneeId(task.getAssigneeId()).assigneeName(assigneeName).assigneeAvatar(assigneeAvatar)
                .priority(task.getPriority().name()).dueDate(task.getDueDate())
                .labels(task.getLabels() != null && !task.getLabels().isBlank()
                        ? Arrays.asList(task.getLabels().split(",")) : List.of())
                .milestone(task.getMilestone()).sprint(task.getSprint())
                .dependencies(dependencies)
                .branchName(task.getBranchName())
                .pullRequestNumber(task.getPullRequestNumber())
                .pullRequestUrl(task.getPullRequestUrl())
                .pullRequestState(task.getPullRequestState())
                .startedAt(task.getStartedAt())
                .prCreatedAt(task.getPrCreatedAt())
                .prMergedAt(task.getPrMergedAt())
                .createdAt(task.getCreatedAt()).build();
    }
}
