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
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BoardService {

    private final BoardRepository boardRepository;
    private final BoardColumnRepository columnRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    public BoardResponse getBoard(String boardId) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new ResourceNotFoundException("Board", boardId));
        return toResponse(board);
    }

    public BoardResponse getProjectBoard(String projectId) {
        List<Board> boards = boardRepository.findByProjectId(projectId);
        if (boards.isEmpty()) {
            return null;
        }
        return toResponse(boards.get(0));
    }

    @Transactional
    public BoardResponse createBoard(String name, String projectId, String createdBy, List<String> columnNames) {
        Board board = Board.builder()
                .name(name)
                .projectId(projectId)
                .createdBy(createdBy)
                .build();
        board = boardRepository.save(board);

        for (int i = 0; i < columnNames.size(); i++) {
            BoardColumn column = BoardColumn.builder()
                    .boardId(board.getId())
                    .name(columnNames.get(i))
                    .position(i)
                    .build();
            columnRepository.save(column);
        }

        return toResponse(board);
    }

    @Transactional
    public BoardResponse.TaskDto createTask(CreateTaskRequest request) {
        Task task = Task.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .columnId(request.getColumnId())
                .boardId(getBoardIdFromColumn(request.getColumnId()))
                .position(countTasksInColumn(request.getColumnId()))
                .assigneeId(request.getAssigneeId())
                .priority(request.getPriority() != null ?
                        Task.Priority.valueOf(request.getPriority()) : Task.Priority.MEDIUM)
                .dueDate(request.getDueDate())
                .labels(request.getLabels())
                .build();
        task = taskRepository.save(task);
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

        // Reorder tasks in old column
        if (!oldColumnId.equals(request.getNewColumnId())) {
            List<Task> oldColumnTasks = taskRepository.findByColumnIdOrderByPositionAsc(oldColumnId);
            for (int i = 0; i < oldColumnTasks.size(); i++) {
                oldColumnTasks.get(i).setPosition(i);
            }
            taskRepository.saveAll(oldColumnTasks);
        }

        // Reorder tasks in new column
        List<Task> newColumnTasks = taskRepository.findByColumnIdOrderByPositionAsc(request.getNewColumnId());
        for (int i = 0; i < newColumnTasks.size(); i++) {
            newColumnTasks.get(i).setPosition(i);
        }
        taskRepository.saveAll(newColumnTasks);
    }

    @Transactional
    public Task updateTask(String taskId, CreateTaskRequest request) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task", taskId));

        if (request.getTitle() != null) task.setTitle(request.getTitle());
        if (request.getDescription() != null) task.setDescription(request.getDescription());
        if (request.getAssigneeId() != null) task.setAssigneeId(request.getAssigneeId());
        if (request.getPriority() != null) task.setPriority(Task.Priority.valueOf(request.getPriority()));
        if (request.getDueDate() != null) task.setDueDate(request.getDueDate());
        if (request.getLabels() != null) task.setLabels(request.getLabels());

        return taskRepository.save(task);
    }

    @Transactional
    public void deleteTask(String taskId) {
        taskRepository.deleteById(taskId);
    }

    private String getBoardIdFromColumn(String columnId) {
        BoardColumn column = columnRepository.findById(columnId)
                .orElseThrow(() -> new ResourceNotFoundException("BoardColumn", columnId));
        return column.getBoardId();
    }

    private int countTasksInColumn(String columnId) {
        return taskRepository.findByColumnIdOrderByPositionAsc(columnId).size();
    }

    private BoardResponse toResponse(Board board) {
        List<BoardColumn> columns = columnRepository.findByBoardIdOrderByPositionAsc(board.getId());
        List<BoardResponse.ColumnDto> columnDtos = columns.stream()
                .map(col -> {
                    List<Task> tasks = taskRepository.findByColumnIdOrderByPositionAsc(col.getId());
                    return BoardResponse.ColumnDto.builder()
                            .id(col.getId())
                            .name(col.getName())
                            .position(col.getPosition())
                            .color(col.getColor())
                            .tasks(tasks.stream().map(this::toTaskDto).toList())
                            .build();
                })
                .toList();

        return BoardResponse.builder()
                .id(board.getId())
                .name(board.getName())
                .projectId(board.getProjectId())
                .description(board.getDescription())
                .columns(columnDtos)
                .createdAt(board.getCreatedAt())
                .build();
    }

    private BoardResponse.TaskDto toTaskDto(Task task) {
        String assigneeName = null;
        String assigneeAvatar = null;
        if (task.getAssigneeId() != null) {
            var user = userRepository.findById(task.getAssigneeId()).orElse(null);
            if (user != null) {
                assigneeName = user.getFullName();
                assigneeAvatar = user.getAvatarUrl();
            }
        }

        List<String> labelsList = task.getLabels() != null && !task.getLabels().isBlank()
                ? Arrays.asList(task.getLabels().split(","))
                : List.of();

        return BoardResponse.TaskDto.builder()
                .id(task.getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .columnId(task.getColumnId())
                .position(task.getPosition())
                .assigneeId(task.getAssigneeId())
                .assigneeName(assigneeName)
                .assigneeAvatar(assigneeAvatar)
                .priority(task.getPriority().name())
                .dueDate(task.getDueDate())
                .labels(labelsList)
                .createdAt(task.getCreatedAt())
                .build();
    }
}
