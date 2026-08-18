package com.devsync.kanban;

import com.devsync.activity.ActivityService;
import com.devsync.notification.NotificationService;
import com.devsync.kanban.dto.BoardResponse;
import com.devsync.kanban.entity.Board;
import com.devsync.kanban.entity.BoardColumn;
import com.devsync.kanban.entity.Task;
import com.devsync.kanban.repository.BoardColumnRepository;
import com.devsync.kanban.repository.BoardRepository;
import com.devsync.kanban.repository.TaskDependencyRepository;
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
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BoardServiceCalendarTest {

    @Mock private BoardRepository boardRepository;
    @Mock private BoardColumnRepository columnRepository;
    @Mock private TaskRepository taskRepository;
    @Mock private TaskDependencyRepository dependencyRepository;
    @Mock private UserRepository userRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private ProjectMemberRepository projectMemberRepository;
    @Mock private ActivityService activityService;
    @Mock private NotificationService notificationService;
    @Mock private com.devsync.github.GitHubClient githubClient;
    @Mock private com.devsync.github.GitHubIntegrationService githubIntegrationService;
    @Mock private com.devsync.github.repository.ProjectGitHubLinkRepository githubLinkRepository;

    private BoardService boardService;

    private Instant from;
    private Instant to;

    @BeforeEach
    void setUp() {
        boardService = new BoardService(boardRepository, columnRepository, taskRepository,
                dependencyRepository,
                userRepository, projectRepository, projectMemberRepository, activityService,
                notificationService, githubClient, githubIntegrationService, githubLinkRepository);
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

    // ── Project-scoped calendar ────────────────────────────────────────────

    @Test
    void getProjectCalendarTasks_shouldReturnTasksOnlyFromThatProject_WithColumnName() {
        Project project = project("p1"); // owned by u1 → canViewProject
        Board board = Board.builder().name("B").projectId("p1").createdBy("u1").build();
        board.setId("b1");
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(boardRepository.findByProjectId("p1")).thenReturn(List.of(board));

        Task due = task("t1", "b1", Instant.parse("2026-06-15T10:00:00Z"));
        when(taskRepository.findByDueDateBetweenAndBoardIdInOrderByDueDateAsc(from, to, List.of("b1")))
                .thenReturn(List.of(due));
        BoardColumn col = BoardColumn.builder().name("In Progress").build();
        col.setId("col");
        when(columnRepository.findAllById(Set.of("col"))).thenReturn(List.of(col));

        List<BoardResponse.TaskDto> result = boardService.getProjectCalendarTasks("p1", from, to, "u1");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo("t1");
        assertThat(result.get(0).getColumnName()).isEqualTo("In Progress");
        // Only p1's board was queried — tasks from other projects cannot leak in.
        verify(taskRepository).findByDueDateBetweenAndBoardIdInOrderByDueDateAsc(from, to, List.of("b1"));
    }

    @Test
    void getProjectCalendarTasks_shouldReject_NonMember() {
        Project project = project("p2");
        project.setOwnerId("u2"); // owned by someone else
        when(projectRepository.findById("p2")).thenReturn(Optional.of(project));
        when(projectMemberRepository.existsByProjectIdAndUserId("p2", "u1")).thenReturn(false);

        assertThatThrownBy(() -> boardService.getProjectCalendarTasks("p2", from, to, "u1"))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class)
                .hasMessageContaining("not a member");
        verify(taskRepository, never()).findByDueDateBetweenAndBoardIdInOrderByDueDateAsc(any(), any(), any());
    }

    @Test
    void getProjectCalendarTasks_shouldReturnEmpty_WhenProjectHasNoBoards() {
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project("p1")));
        when(boardRepository.findByProjectId("p1")).thenReturn(List.of());

        List<BoardResponse.TaskDto> result = boardService.getProjectCalendarTasks("p1", from, to, "u1");

        assertThat(result).isEmpty();
        verify(taskRepository, never()).findByDueDateBetweenAndBoardIdInOrderByDueDateAsc(any(), any(), any());
    }

    @Test
    void getProjectCalendarTasks_shouldReject_InvalidWindow() {
        assertThatThrownBy(() -> boardService.getProjectCalendarTasks("p1", to, from, "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("after");
    }

    private User user(String id, String role) {
        User u = User.builder().email(id + "@test.com").fullName("U").build();
        u.setId(id);
        u.setRole(User.Role.valueOf(role));
        return u;
    }
}
