package com.devsync.kanban;

import com.devsync.activity.ActivityService;
import com.devsync.activity.entity.ActivityType;
import com.devsync.common.ResourceNotFoundException;
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
        if (request.getDueDate() != null) task.setDueDate(request.getDueDate());
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
        if (from == null || to == null) {
            throw new IllegalArgumentException("from and to are required");
        }
        if (from.isAfter(to)) {
            throw new IllegalArgumentException("from must not be after to");
        }
        if (Duration.between(from, to).toDays() > 366) {
            throw new IllegalArgumentException("Date range too large (max 366 days)");
        }

        var user = userRepository.findById(userId).orElse(null);
        if (user != null && user.getRole() == com.devsync.user.entity.User.Role.ADMIN) {
            return taskRepository.findByDueDateBetweenOrderByDueDateAsc(from, to).stream()
                    .map(this::toTaskDto).toList();
        }

        Set<String> projectIds = new HashSet<>();
        projectRepository.findByOwnerId(userId).forEach(p -> projectIds.add(p.getId()));
        projectRepository.findProjectsByUserId(userId).forEach(p -> projectIds.add(p.getId()));
        if (projectIds.isEmpty()) return List.of();

        List<String> boardIds = boardRepository.findByProjectIdIn(projectIds).stream()
                .map(Board::getId).toList();
        if (boardIds.isEmpty()) return List.of();
        return taskRepository.findByDueDateBetweenAndBoardIdInOrderByDueDateAsc(from, to, boardIds).stream()
                .map(this::toTaskDto).toList();
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

    private boolean isDoneColumn(String name) {
        String n = name == null ? "" : name.toLowerCase();
        return n.contains("done") || n.contains("complete");
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
                .createdAt(task.getCreatedAt()).build();
    }
}
