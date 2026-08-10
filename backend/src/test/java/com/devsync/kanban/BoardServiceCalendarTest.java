package com.devsync.kanban;

import com.devsync.activity.ActivityService;
import com.devsync.kanban.dto.BoardResponse;
import com.devsync.kanban.entity.Board;
import com.devsync.kanban.entity.Task;
import com.devsync.kanban.repository.BoardColumnRepository;
import com.devsync.kanban.repository.BoardRepository;
import com.devsync.kanban.repository.TaskRepository;
import com.devsync.project.entity.Project;
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

@ExtendWith(MockitoExtension.class)
class BoardServiceCalendarTest {

    @Mock private BoardRepository boardRepository;
    @Mock private BoardColumnRepository columnRepository;
    @Mock private TaskRepository taskRepository;
    @Mock private UserRepository userRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private ProjectMemberRepository projectMemberRepository;
    @Mock private ActivityService activityService;

    private BoardService boardService;

    private Instant from;
    private Instant to;

    @BeforeEach
    void setUp() {
        boardService = new BoardService(boardRepository, columnRepository, taskRepository,
                userRepository, projectRepository, projectMemberRepository, activityService);
        from = Instant.parse("2026-06-01T00:00:00Z");
        to = Instant.parse("2026-06-30T23:59:59Z");
    }

    private Project project(String id) {
        Project p = Project.builder().name("P").ownerId("u1").build();
        p.setId(id);
        return p;
    }

    private Task task(String id, String boardId, Instant dueDate) {
        Task t = Task.builder().title("Task " + id).columnId("col").boardId(boardId)
                .position(0).dueDate(dueDate).build();
        t.setId(id);
        return t;
    }

    @Test
    void getCalendarTasks_shouldReturnTasksInRange_ForMemberProjects() {
        when(userRepository.findById("u1")).thenReturn(Optional.of(user("u1", "USER")));
        when(projectRepository.findByOwnerId("u1")).thenReturn(List.of());
        when(projectRepository.findProjectsByUserId("u1")).thenReturn(List.of(project("p1")));

        Board board = Board.builder().name("B").projectId("p1").createdBy("u1").build();
        board.setId("b1");
        when(boardRepository.findByProjectIdIn(anySet())).thenReturn(List.of(board));

        Task due = task("t1", "b1", Instant.parse("2026-06-15T10:00:00Z"));
        when(taskRepository.findByDueDateBetweenAndBoardIdInOrderByDueDateAsc(from, to, List.of("b1")))
                .thenReturn(List.of(due));

        List<BoardResponse.TaskDto> result = boardService.getCalendarTasks(from, to, "u1");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo("t1");
        assertThat(result.get(0).getDueDate()).isEqualTo(Instant.parse("2026-06-15T10:00:00Z"));
    }

    @Test
    void getCalendarTasks_shouldIncludeOwnedProjects() {
        when(userRepository.findById("u1")).thenReturn(Optional.of(user("u1", "USER")));
        when(projectRepository.findByOwnerId("u1")).thenReturn(List.of(project("p1")));
        when(projectRepository.findProjectsByUserId("u1")).thenReturn(List.of());

        Board board = Board.builder().name("B").projectId("p1").createdBy("u1").build();
        board.setId("b1");
        when(boardRepository.findByProjectIdIn(anySet())).thenReturn(List.of(board));
        when(taskRepository.findByDueDateBetweenAndBoardIdInOrderByDueDateAsc(from, to, List.of("b1")))
                .thenReturn(List.of(task("t1", "b1", from)));

        List<BoardResponse.TaskDto> result = boardService.getCalendarTasks(from, to, "u1");

        assertThat(result).hasSize(1);
    }

    @Test
    void getCalendarTasks_shouldReturnEmpty_WhenNoAccessibleProjects() {
        when(userRepository.findById("u1")).thenReturn(Optional.of(user("u1", "USER")));
        when(projectRepository.findByOwnerId("u1")).thenReturn(List.of());
        when(projectRepository.findProjectsByUserId("u1")).thenReturn(List.of());

        List<BoardResponse.TaskDto> result = boardService.getCalendarTasks(from, to, "u1");

        assertThat(result).isEmpty();
        verify(taskRepository, never()).findByDueDateBetweenAndBoardIdInOrderByDueDateAsc(any(), any(), any());
    }

    @Test
    void getCalendarTasks_shouldReturnAllTasks_ForAdmin() {
        when(userRepository.findById("admin1")).thenReturn(Optional.of(user("admin1", "ADMIN")));
        Task due = task("t1", "b1", from);
        when(taskRepository.findByDueDateBetweenOrderByDueDateAsc(from, to)).thenReturn(List.of(due));

        List<BoardResponse.TaskDto> result = boardService.getCalendarTasks(from, to, "admin1");

        assertThat(result).hasSize(1);
        // Admin path does not scope by project membership.
        verify(projectRepository, never()).findProjectsByUserId(anyString());
    }

    @Test
    void getCalendarTasks_shouldReject_InvertedRange() {
        assertThatThrownBy(() -> boardService.getCalendarTasks(to, from, "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("after");
    }

    @Test
    void getCalendarTasks_shouldReject_WindowLargerThan366Days() {
        Instant farTo = from.plusSeconds(400L * 86400);

        assertThatThrownBy(() -> boardService.getCalendarTasks(from, farTo, "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("max 366");
    }

    private User user(String id, String role) {
        User u = User.builder().email(id + "@test.com").fullName("U").build();
        u.setId(id);
        u.setRole(User.Role.valueOf(role));
        return u;
    }
}
