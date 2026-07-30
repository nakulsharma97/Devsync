package com.devsync.kanban;

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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BoardService {

    private final BoardRepository boardRepository;
    private final BoardColumnRepository columnRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;

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
        return toTaskDto(task);
    }

    @Transactional
    public void updateTaskPosition(UpdateTaskPositionRequest request) {
        Task task = taskRepository.findById(request.getTaskId())
                .orElseThrow(() -> new ResourceNotFoundException("Task", request.getTaskId()));
        String oldColumnId = task.getColumnId();
        task.setColumnId(request.getNewColumnId());
        task.setPosition(request.getNewPosition());
        taskRepository.save(task);
        if (!oldColumnId.equals(request.getNewColumnId())) reorderColumn(oldColumnId);
        reorderColumn(request.getNewColumnId());
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
        return taskRepository.save(task);
    }

    @Transactional
    public void deleteTask(String taskId, String userId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task", taskId));
        verifyBoardAccess(task.getBoardId(), userId);
        taskRepository.deleteById(taskId);
    }

    private void verifyBoardAccess(String boardId, String userId) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new ResourceNotFoundException("Board", boardId));
        Project project = projectRepository.findById(board.getProjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Project", board.getProjectId()));
        if (project.getOwnerId().equals(userId)) return;
        boolean isAdmin = projectMemberRepository.findByProjectIdAndUserId(board.getProjectId(), userId)
                .filter(m -> m.getRole() == ProjectMember.Role.ADMIN || m.getRole() == ProjectMember.Role.OWNER)
                .isPresent();
        if (!isAdmin) {
            throw new IllegalArgumentException("You don't have permission to modify tasks in this project");
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
