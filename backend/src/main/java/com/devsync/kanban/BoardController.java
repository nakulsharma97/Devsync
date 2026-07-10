package com.devsync.kanban;

import com.devsync.kanban.dto.BoardResponse;
import com.devsync.kanban.dto.CreateTaskRequest;
import com.devsync.kanban.dto.UpdateTaskPositionRequest;
import com.devsync.kanban.entity.Task;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/boards")
@RequiredArgsConstructor
public class BoardController {

    private final BoardService boardService;

    @GetMapping("/{boardId}")
    public ResponseEntity<BoardResponse> getBoard(@PathVariable String boardId) {
        return ResponseEntity.ok(boardService.getBoard(boardId));
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<BoardResponse> getProjectBoard(@PathVariable String projectId) {
        BoardResponse board = boardService.getProjectBoard(projectId);
        if (board == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(board);
    }

    @PostMapping
    public ResponseEntity<BoardResponse> createBoard(
            @RequestParam String name,
            @RequestParam String projectId,
            @RequestParam(required = false, defaultValue = "To Do,In Progress,Done") List<String> columns,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(boardService.createBoard(name, projectId, userDetails.getUsername(), columns));
    }

    @PostMapping("/tasks")
    public ResponseEntity<BoardResponse.TaskDto> createTask(@Valid @RequestBody CreateTaskRequest request) {
        return ResponseEntity.ok(boardService.createTask(request));
    }

    @PutMapping("/tasks/position")
    public ResponseEntity<Void> updateTaskPosition(@Valid @RequestBody UpdateTaskPositionRequest request) {
        boardService.updateTaskPosition(request);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/tasks/{taskId}")
    public ResponseEntity<BoardResponse.TaskDto> updateTask(
            @PathVariable String taskId,
            @Valid @RequestBody CreateTaskRequest request) {
        Task task = boardService.updateTask(taskId, request);
        return ResponseEntity.ok(boardService.getBoard(getBoardIdFromColumn(request.getColumnId()))
                .getColumns().stream()
                .flatMap(c -> c.getTasks().stream())
                .filter(t -> t.getId().equals(taskId))
                .findFirst()
                .orElseThrow());
    }

    @DeleteMapping("/tasks/{taskId}")
    public ResponseEntity<Void> deleteTask(@PathVariable String taskId) {
        boardService.deleteTask(taskId);
        return ResponseEntity.noContent().build();
    }

    private String getBoardIdFromColumn(String columnId) {
        return columnId; // Simplified — would need column lookup
    }
}
