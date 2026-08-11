package com.devsync.kanban;

import com.devsync.kanban.dto.BoardResponse;
import com.devsync.kanban.dto.CreateTaskRequest;
import com.devsync.kanban.dto.UpdateTaskPositionRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/boards")
@RequiredArgsConstructor
public class BoardController {

    private final BoardService boardService;

    @GetMapping("/{boardId}")
    public ResponseEntity<BoardResponse> getBoard(
            @PathVariable String boardId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(boardService.getBoard(boardId, userDetails.getUsername()));
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<BoardResponse> getProjectBoard(
            @PathVariable String projectId,
            @AuthenticationPrincipal UserDetails userDetails) {
        BoardResponse board = boardService.getProjectBoard(projectId, userDetails.getUsername());
        return board == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(board);
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
    public ResponseEntity<BoardResponse.TaskDto> createTask(
            @Valid @RequestBody CreateTaskRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(boardService.createTask(request, userDetails.getUsername()));
    }

    @PutMapping("/tasks/position")
    public ResponseEntity<Void> updateTaskPosition(@Valid @RequestBody UpdateTaskPositionRequest request,
                                                  @AuthenticationPrincipal UserDetails userDetails) {
        boardService.updateTaskPosition(request, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @PutMapping("/tasks/{taskId}")
    public ResponseEntity<BoardResponse.TaskDto> updateTask(
            @PathVariable String taskId,
            @Valid @RequestBody CreateTaskRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        // The response is resolved from the updated task itself (same
        // authorization) rather than by looking up a "board" from a column id.
        boardService.updateTask(taskId, request, userDetails.getUsername());
        return ResponseEntity.ok(boardService.getTaskDto(taskId, userDetails.getUsername()));
    }

    @DeleteMapping("/tasks/{taskId}")
    public ResponseEntity<Void> deleteTask(
            @PathVariable String taskId,
            @AuthenticationPrincipal UserDetails userDetails) {
        boardService.deleteTask(taskId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/tasks/calendar")
    public ResponseEntity<List<BoardResponse.TaskDto>> calendarTasks(
            @RequestParam String from,
            @RequestParam String to,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(boardService.getCalendarTasks(
                Instant.parse(from), Instant.parse(to), userDetails.getUsername()));
    }

    @GetMapping("/project/{projectId}/tasks")
    public ResponseEntity<Page<BoardResponse.TaskDto>> filterTasks(
            @PathVariable String projectId,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String label,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(boardService.filterTasks(projectId, priority, label, status, keyword,
                page, size, userDetails.getUsername()));
    }
}
