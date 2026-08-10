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
import com.devsync.kanban.repository.BoardColumnRepository;
import com.devsync.kanban.repository.BoardRepository;
import com.devsync.kanban.repository.TaskRepository;
import com.devsync.project.entity.Project;
import com.devsync.project.entity.ProjectMember;
import com.devsync.project.repository.ProjectMemberRepository;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class BoardService {

    private final BoardRepository boardRepository;
    private final BoardColumnRepository columnRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ActivityService activityService;

    public BoardResponse getBoard(String boardId) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new ResourceNotFoundException("Board", boardId));
        return toResponse(board);
    }

    public BoardResponse getProjectBoard(String projectId) {
        List<Board> boards = boardRepository.findByProjectId(projectId);
        return boards.isEmpty() ? null : toResponse(boards.get(0));
    }

    @Transactional
    public BoardResponse createBoard(String name, String projectId, String createdBy, List<String> columnNames) {
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
        verifyBoardAccess(boardId, userId);

        int nextPosition = taskRepository.findMaxPositionByColumnId(request.getColumnId()).orElse(-1) + 1;
        Task task = taskRepository.save(Task.builder()
                .title(request.getTitle()).description(request.getDescription())
                .columnId(request.getColumnId())
                .boardId(boardId)
                .position(nextPosition)
                .assigneeId(request.getAssigneeId())
                .priority(request.getPriority() != null ? Task.Priority.valueOf(request.getPriority()) : Task.Priority.MEDIUM)
                .dueDate(request.getDueDate()).labels(request.getLabels())
                .build());
        String projectId = projectIdOfBoard(boardId);
        activityService.record(userId, projectId, ActivityType.TASK_CREATED,
                "Task created", task.getTitle(), null);
        if (request.getAssigneeId() != null && !request.getAssigneeId().equals(userId)) {
            activityService.record(userId, projectId, ActivityType.TASK_ASSIGNED,
                    "Task assigned", task.getTitle(), null);
        }
        return toTaskDto(task);
    }

    @Transactional
    public void updateTaskPosition(UpdateTaskPositionRequest request, String userId) {
        Task task = taskRepository.findById(request.getTaskId())
                .orElseThrow(() -> new ResourceNotFoundException("Task", request.getTaskId()));
        verifyTaskProjectEditable(task);
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
        verifyBoardAccess(task.getBoardId(), userId);

        if (request.getTitle() != null) task.setTitle(request.getTitle());
        if (request.getDescription() != null) task.setDescription(request.getDescription());
        if (request.getAssigneeId() != null) task.setAssigneeId(request.getAssigneeId());
        if (request.getPriority() != null) task.setPriority(Task.Priority.valueOf(request.getPriority()));
        if (request.getDueDate() != null) task.setDueDate(request.getDueDate());
        if (request.getLabels() != null) task.setLabels(request.getLabels());
        task = taskRepository.save(task);
        activityService.record(userId, projectIdOfBoard(task.getBoardId()), ActivityType.TASK_UPDATED,
                "Task updated", task.getTitle(), null);
        return task;
    }

    @Transactional
    public void deleteTask(String taskId, String userId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task", taskId));
        verifyBoardAccess(task.getBoardId(), userId);
        String projectId = projectIdOfBoard(task.getBoardId());
        taskRepository.deleteById(taskId);
        activityService.record(userId, projectId, ActivityType.TASK_DELETED,
                "Task deleted", task.getTitle(), null);
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
        Project project = projectRepository.findById(projectId)
                .filter(p -> !p.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
        if (!canViewProject(project, userId)) {
            throw new IllegalArgumentException("You are not a member of this project");
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

    private String projectIdOfBoard(String boardId) {
        return boardRepository.findById(boardId).map(Board::getProjectId).orElse(null);
    }

    private boolean isDoneColumn(String name) {
        String n = name == null ? "" : name.toLowerCase();
        return n.contains("done") || n.contains("complete");
    }

    private void verifyBoardAccess(String boardId, String userId) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new ResourceNotFoundException("Board", boardId));
        Project project = projectRepository.findById(board.getProjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Project", board.getProjectId()));
        ensureProjectEditable(project);
        if (project.getOwnerId().equals(userId)) return;
        boolean isAdmin = projectMemberRepository.findByProjectIdAndUserId(board.getProjectId(), userId)
                .filter(m -> m.getRole() == ProjectMember.Role.ADMIN || m.getRole() == ProjectMember.Role.OWNER)
                .isPresent();
        if (!isAdmin) {
            throw new IllegalArgumentException("You don't have permission to modify tasks in this project");
        }
    }

    private void verifyTaskProjectEditable(Task task) {
        Board board = boardRepository.findById(task.getBoardId())
                .orElseThrow(() -> new ResourceNotFoundException("Board", task.getBoardId()));
        Project project = projectRepository.findById(board.getProjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Project", board.getProjectId()));
        ensureProjectEditable(project);
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
                .map(col -> BoardResponse.ColumnDto.builder()
                        .id(col.getId()).name(col.getName()).position(col.getPosition()).color(col.getColor())
                        .tasks(taskRepository.findByColumnIdOrderByPositionAsc(col.getId()).stream()
                                .map(this::toTaskDto).toList())
                        .build())
                .toList();
        return BoardResponse.builder()
                .id(board.getId()).name(board.getName()).projectId(board.getProjectId())
                .description(board.getDescription()).columns(columnDtos)
                .createdAt(board.getCreatedAt()).build();
    }

    private BoardResponse.TaskDto toTaskDto(Task task) {
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
                .createdAt(task.getCreatedAt()).build();
    }
}
