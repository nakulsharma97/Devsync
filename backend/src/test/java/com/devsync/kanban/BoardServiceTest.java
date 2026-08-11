package com.devsync.kanban;

import com.devsync.activity.ActivityService;
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
import com.devsync.notification.NotificationService;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BoardServiceTest {

    @Mock private BoardRepository boardRepository;
    @Mock private BoardColumnRepository columnRepository;
    @Mock private TaskRepository taskRepository;
    @Mock private UserRepository userRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private ProjectMemberRepository projectMemberRepository;
    @Mock private ActivityService activityService;
    @Mock private NotificationService notificationService;

    private BoardService boardService;

    @BeforeEach
    void setUp() {
        boardService = new BoardService(boardRepository, columnRepository, taskRepository,
                userRepository, projectRepository, projectMemberRepository, activityService,
                notificationService);
    }

    @Test
    void createTask_shouldThrow_WhenProjectArchived() {
        BoardColumn col = columnWithId("c1", "b1");
        Board board = boardWithId("b1", "p1");
        Project project = projectWithId("p1");
        project.setStatus(Project.ProjectStatus.ARCHIVED);

        when(columnRepository.findById("c1")).thenReturn(Optional.of(col));
        when(boardRepository.findById("b1")).thenReturn(Optional.of(board));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));

        CreateTaskRequest request = mock(CreateTaskRequest.class);
        when(request.getColumnId()).thenReturn("c1");

        assertThatThrownBy(() -> boardService.createTask(request, "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("archived");

        verify(taskRepository, never()).save(any());
    }

    @Test
    void createTask_shouldThrow_WhenProjectDeleted() {
        BoardColumn col = columnWithId("c1", "b1");
        Board board = boardWithId("b1", "p1");
        Project project = projectWithId("p1");
        project.setDeleted(true);

        when(columnRepository.findById("c1")).thenReturn(Optional.of(col));
        when(boardRepository.findById("b1")).thenReturn(Optional.of(board));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));

        CreateTaskRequest request = mock(CreateTaskRequest.class);
        when(request.getColumnId()).thenReturn("c1");

        assertThatThrownBy(() -> boardService.createTask(request, "u1"))
                .isInstanceOf(com.devsync.common.ResourceNotFoundException.class);

        verify(taskRepository, never()).save(any());
    }

    @Test
    void createTask_shouldSucceed_WhenProjectActive() {
        BoardColumn col = columnWithId("c1", "b1");
        Board board = boardWithId("b1", "p1");
        Project project = projectWithId("p1");

        when(columnRepository.findById("c1")).thenReturn(Optional.of(col));
        when(boardRepository.findById("b1")).thenReturn(Optional.of(board));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(taskRepository.findMaxPositionByColumnId("c1")).thenReturn(Optional.of(2));
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateTaskRequest request = mock(CreateTaskRequest.class);
        when(request.getColumnId()).thenReturn("c1");
        when(request.getTitle()).thenReturn("Build feature");

        BoardResponse.TaskDto dto = boardService.createTask(request, "owner1");

        org.assertj.core.api.Assertions.assertThat(dto.getTitle()).isEqualTo("Build feature");
    }

    @Test
    void createTask_shouldThrow_WhenUserIsNotProjectMember() {
        // Unauthorized task access: a stranger must never create tasks.
        BoardColumn col = columnWithId("c1", "b1");
        Board board = boardWithId("b1", "p1");
        Project project = projectWithId("p1");

        when(columnRepository.findById("c1")).thenReturn(Optional.of(col));
        when(boardRepository.findById("b1")).thenReturn(Optional.of(board));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(projectMemberRepository.findByProjectIdAndUserId("p1", "stranger"))
                .thenReturn(Optional.empty());

        CreateTaskRequest request = mock(CreateTaskRequest.class);
        when(request.getColumnId()).thenReturn("c1");

        assertThatThrownBy(() -> boardService.createTask(request, "stranger"))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class)
                .hasMessageContaining("not a member");

        verify(taskRepository, never()).save(any());
    }

    @Test
    void createTask_shouldSucceed_WhenMemberRole() {
        // MEMBER-role participants collaborate on tasks (create/move/complete).
        BoardColumn col = columnWithId("c1", "b1");
        Board board = boardWithId("b1", "p1");
        Project project = projectWithId("p1");
        ProjectMember member = ProjectMember.builder()
                .projectId("p1").userId("member1").role(ProjectMember.Role.MEMBER).build();

        when(columnRepository.findById("c1")).thenReturn(Optional.of(col));
        when(boardRepository.findById("b1")).thenReturn(Optional.of(board));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(projectMemberRepository.findByProjectIdAndUserId("p1", "member1"))
                .thenReturn(Optional.of(member));
        when(taskRepository.findMaxPositionByColumnId("c1")).thenReturn(Optional.of(0));
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateTaskRequest request = mock(CreateTaskRequest.class);
        when(request.getColumnId()).thenReturn("c1");
        when(request.getTitle()).thenReturn("Collaborate");

        BoardResponse.TaskDto dto = boardService.createTask(request, "member1");

        org.assertj.core.api.Assertions.assertThat(dto.getTitle()).isEqualTo("Collaborate");
        verify(taskRepository).save(any(Task.class));
    }

    @Test
    void createTask_shouldThrow_WhenViewerRole() {
        // VIEWER can read but never modify tasks.
        BoardColumn col = columnWithId("c1", "b1");
        Board board = boardWithId("b1", "p1");
        Project project = projectWithId("p1");
        ProjectMember viewer = ProjectMember.builder()
                .projectId("p1").userId("viewer1").role(ProjectMember.Role.VIEWER).build();

        when(columnRepository.findById("c1")).thenReturn(Optional.of(col));
        when(boardRepository.findById("b1")).thenReturn(Optional.of(board));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(projectMemberRepository.findByProjectIdAndUserId("p1", "viewer1"))
                .thenReturn(Optional.of(viewer));

        CreateTaskRequest request = mock(CreateTaskRequest.class);
        when(request.getColumnId()).thenReturn("c1");

        assertThatThrownBy(() -> boardService.createTask(request, "viewer1"))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class)
                .hasMessageContaining("Viewers cannot modify");

        verify(taskRepository, never()).save(any());
    }

    @Test
    void updateTask_shouldThrow_WhenUserIsNotProjectMember() {
        Task task = Task.builder().boardId("b1").title("Existing").build();
        task.setId("t1");
        Board board = boardWithId("b1", "p1");
        Project project = projectWithId("p1");

        when(taskRepository.findById("t1")).thenReturn(Optional.of(task));
        when(boardRepository.findById("b1")).thenReturn(Optional.of(board));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(projectMemberRepository.findByProjectIdAndUserId("p1", "stranger"))
                .thenReturn(Optional.empty());

        CreateTaskRequest request = mock(CreateTaskRequest.class);

        assertThatThrownBy(() -> boardService.updateTask("t1", request, "stranger"))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class)
                .hasMessageContaining("not a member");

        verify(taskRepository, never()).save(any());
    }

    // ── Task assignment authorization + notifications ────────

    private User userWithId(String id) {
        User user = User.builder().email(id + "@test.dev").fullName("User " + id).password("x").build();
        user.setId(id);
        return user;
    }

    @Test
    void createTask_shouldAssignMember_AndNotifyOnce() {
        BoardColumn col = columnWithId("c1", "b1");
        Board board = boardWithId("b1", "p1");
        Project project = projectWithId("p1");
        User assignee = userWithId("member2");

        when(columnRepository.findById("c1")).thenReturn(Optional.of(col));
        when(boardRepository.findById("b1")).thenReturn(Optional.of(board));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(userRepository.findById("member2")).thenReturn(Optional.of(assignee));
        when(projectMemberRepository.existsByProjectIdAndUserId("p1", "member2")).thenReturn(true);
        when(taskRepository.findMaxPositionByColumnId("c1")).thenReturn(Optional.of(0));
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> {
            Task t = inv.getArgument(0);
            t.setId("t-new");
            return t;
        });
        when(userRepository.findById("owner1")).thenReturn(Optional.of(userWithId("owner1")));

        CreateTaskRequest request = mock(CreateTaskRequest.class);
        when(request.getColumnId()).thenReturn("c1");
        when(request.getTitle()).thenReturn("Build feature");
        when(request.getAssigneeId()).thenReturn("member2");

        boardService.createTask(request, "owner1");

        verify(taskRepository).save(argThat(t -> "member2".equals(t.getAssigneeId())));
        verify(activityService).record(eq("owner1"), eq("p1"), eq(com.devsync.activity.entity.ActivityType.TASK_ASSIGNED),
                anyString(), anyString(), any());
        verify(notificationService).createNotification(
                eq("member2"), eq("TASK_ASSIGNED"), eq("Task assigned"),
                contains("assigned you a task in DevSync"),
                eq("owner1"), anyString(), isNull(), eq("t-new"), eq("task"), eq("/board/p1"));
        verify(notificationService, times(1)).createNotification(anyString(), eq("TASK_ASSIGNED"), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void createTask_shouldThrow_WhenAssigneeIsNotProjectMember() {
        BoardColumn col = columnWithId("c1", "b1");
        Board board = boardWithId("b1", "p1");
        Project project = projectWithId("p1");
        // Exists and is active, but belongs to a DIFFERENT project.
        when(columnRepository.findById("c1")).thenReturn(Optional.of(col));
        when(boardRepository.findById("b1")).thenReturn(Optional.of(board));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(userRepository.findById("p2-member")).thenReturn(Optional.of(userWithId("p2-member")));
        when(projectMemberRepository.existsByProjectIdAndUserId("p1", "p2-member")).thenReturn(false);

        CreateTaskRequest request = mock(CreateTaskRequest.class);
        when(request.getColumnId()).thenReturn("c1");
        when(request.getAssigneeId()).thenReturn("p2-member");

        assertThatThrownBy(() -> boardService.createTask(request, "owner1"))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class)
                .hasMessageContaining("not a member");
        verify(taskRepository, never()).save(any());
    }

    @Test
    void createTask_shouldThrow_WhenAssigneeIsDeleted() {
        BoardColumn col = columnWithId("c1", "b1");
        Board board = boardWithId("b1", "p1");
        Project project = projectWithId("p1");
        User assignee = userWithId("deleted-user");
        assignee.setDeleted(true);

        when(columnRepository.findById("c1")).thenReturn(Optional.of(col));
        when(boardRepository.findById("b1")).thenReturn(Optional.of(board));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(userRepository.findById("deleted-user")).thenReturn(Optional.of(assignee));

        CreateTaskRequest request = mock(CreateTaskRequest.class);
        when(request.getColumnId()).thenReturn("c1");
        when(request.getAssigneeId()).thenReturn("deleted-user");

        assertThatThrownBy(() -> boardService.createTask(request, "owner1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("deleted");
        verify(taskRepository, never()).save(any());
    }

    @Test
    void createTask_shouldThrow_WhenAssigneeIsBlocked() {
        BoardColumn col = columnWithId("c1", "b1");
        Board board = boardWithId("b1", "p1");
        Project project = projectWithId("p1");
        User assignee = userWithId("blocked-user");
        assignee.setBlocked(true);

        when(columnRepository.findById("c1")).thenReturn(Optional.of(col));
        when(boardRepository.findById("b1")).thenReturn(Optional.of(board));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(userRepository.findById("blocked-user")).thenReturn(Optional.of(assignee));

        CreateTaskRequest request = mock(CreateTaskRequest.class);
        when(request.getColumnId()).thenReturn("c1");
        when(request.getAssigneeId()).thenReturn("blocked-user");

        assertThatThrownBy(() -> boardService.createTask(request, "owner1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("blocked");
        verify(taskRepository, never()).save(any());
    }

    @Test
    void createTask_shouldThrow_WhenAssigneeDoesNotExist() {
        BoardColumn col = columnWithId("c1", "b1");
        Board board = boardWithId("b1", "p1");
        Project project = projectWithId("p1");

        when(columnRepository.findById("c1")).thenReturn(Optional.of(col));
        when(boardRepository.findById("b1")).thenReturn(Optional.of(board));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(userRepository.findById("ghost")).thenReturn(Optional.empty());

        CreateTaskRequest request = mock(CreateTaskRequest.class);
        when(request.getColumnId()).thenReturn("c1");
        when(request.getAssigneeId()).thenReturn("ghost");

        assertThatThrownBy(() -> boardService.createTask(request, "owner1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Assignee not found");
        verify(taskRepository, never()).save(any());
    }

    @Test
    void updateTask_shouldReassign_AndNotifyOnce() {
        Task task = Task.builder().boardId("b1").title("Existing").assigneeId("member1").build();
        task.setId("t1");
        Board board = boardWithId("b1", "p1");
        Project project = projectWithId("p1");
        User newAssignee = userWithId("member2");

        when(taskRepository.findById("t1")).thenReturn(Optional.of(task));
        when(boardRepository.findById("b1")).thenReturn(Optional.of(board));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(userRepository.findById("member2")).thenReturn(Optional.of(newAssignee));
        when(projectMemberRepository.existsByProjectIdAndUserId("p1", "member2")).thenReturn(true);
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById("owner1")).thenReturn(Optional.of(userWithId("owner1")));

        CreateTaskRequest request = mock(CreateTaskRequest.class);
        when(request.getAssigneeId()).thenReturn("member2");

        boardService.updateTask("t1", request, "owner1");

        assertThat(task.getAssigneeId()).isEqualTo("member2");
        verify(notificationService, times(1)).createNotification(
                eq("member2"), eq("TASK_ASSIGNED"), any(), contains("assigned you a task in"),
                any(), any(), any(), eq("t1"), eq("task"), any());
    }

    @Test
    void updateTask_shouldNotNotify_WhenAssigneeUnchanged() {
        Task task = Task.builder().boardId("b1").title("Existing").assigneeId("member1").build();
        task.setId("t1");
        Board board = boardWithId("b1", "p1");
        Project project = projectWithId("p1");

        when(taskRepository.findById("t1")).thenReturn(Optional.of(task));
        when(boardRepository.findById("b1")).thenReturn(Optional.of(board));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));
        // owner1 is the project owner, so no member lookup is needed for write access.

        CreateTaskRequest request = mock(CreateTaskRequest.class);
        when(request.getAssigneeId()).thenReturn("member1"); // same assignee
        when(request.getTitle()).thenReturn("Renamed");

        boardService.updateTask("t1", request, "owner1");

        verify(notificationService, never()).createNotification(anyString(), eq("TASK_ASSIGNED"), any(), any(), any(), any(), any(), any(), any(), any());
        assertThat(task.getTitle()).isEqualTo("Renamed");
    }

    @Test
    void updateTask_shouldThrow_WhenCrossProjectAssignee() {
        Task task = Task.builder().boardId("b1").title("Existing").build();
        task.setId("t1");
        Board board = boardWithId("b1", "p1");
        Project project = projectWithId("p1");

        when(taskRepository.findById("t1")).thenReturn(Optional.of(task));
        when(boardRepository.findById("b1")).thenReturn(Optional.of(board));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(userRepository.findById("p2-member")).thenReturn(Optional.of(userWithId("p2-member")));
        when(projectMemberRepository.existsByProjectIdAndUserId("p1", "p2-member")).thenReturn(false);

        CreateTaskRequest request = mock(CreateTaskRequest.class);
        when(request.getAssigneeId()).thenReturn("p2-member");

        assertThatThrownBy(() -> boardService.updateTask("t1", request, "owner1"))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class)
                .hasMessageContaining("not a member");
        verify(taskRepository, never()).save(any());
    }

    @Test
    void updateTaskPosition_shouldThrow_WhenProjectArchived() {
        Task task = Task.builder().boardId("b1").build();
        task.setId("t1");
        Board board = boardWithId("b1", "p1");
        Project project = projectWithId("p1");
        project.setStatus(Project.ProjectStatus.ARCHIVED);

        when(taskRepository.findById("t1")).thenReturn(Optional.of(task));
        when(boardRepository.findById("b1")).thenReturn(Optional.of(board));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));

        UpdateTaskPositionRequest request = mock(UpdateTaskPositionRequest.class);
        when(request.getTaskId()).thenReturn("t1");

        assertThatThrownBy(() -> boardService.updateTaskPosition(request, "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("archived");

        verify(taskRepository, never()).save(any());
    }

    // ── Board read access ────────────────────────────────────

    @Test
    void getBoard_shouldSucceed_WhenMember() {
        Board board = boardWithId("b1", "p1");
        Project project = projectWithId("p1");
        when(boardRepository.findById("b1")).thenReturn(Optional.of(board));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(projectMemberRepository.existsByProjectIdAndUserId("p1", "member1")).thenReturn(true);
        when(columnRepository.findByBoardIdOrderByPositionAsc("b1")).thenReturn(java.util.List.of());

        BoardResponse response = boardService.getBoard("b1", "member1");

        org.assertj.core.api.Assertions.assertThat(response.getId()).isEqualTo("b1");
    }

    @Test
    void getBoard_shouldSucceed_WhenViewer() {
        Board board = boardWithId("b1", "p1");
        Project project = projectWithId("p1");
        when(boardRepository.findById("b1")).thenReturn(Optional.of(board));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(projectMemberRepository.existsByProjectIdAndUserId("p1", "viewer1")).thenReturn(true);
        when(columnRepository.findByBoardIdOrderByPositionAsc("b1")).thenReturn(java.util.List.of());

        boardService.getBoard("b1", "viewer1");
    }

    @Test
    void getBoard_shouldThrow_WhenNonMember() {
        Board board = boardWithId("b1", "p1");
        Project project = projectWithId("p1");
        when(boardRepository.findById("b1")).thenReturn(Optional.of(board));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(userRepository.findById("stranger")).thenReturn(Optional.empty());
        when(projectMemberRepository.existsByProjectIdAndUserId("p1", "stranger")).thenReturn(false);

        assertThatThrownBy(() -> boardService.getBoard("b1", "stranger"))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
    }

    @Test
    void getProjectBoard_shouldThrow_WhenNonMember() {
        Project project = projectWithId("p1");
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(userRepository.findById("stranger")).thenReturn(Optional.empty());
        when(projectMemberRepository.existsByProjectIdAndUserId("p1", "stranger")).thenReturn(false);

        assertThatThrownBy(() -> boardService.getProjectBoard("p1", "stranger"))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        verify(boardRepository, never()).findByProjectId(anyString());
    }

    @Test
    void updateTaskPosition_shouldThrow_WhenProjectDeleted() {
        Task task = Task.builder().boardId("b1").columnId("c1").title("T").build();
        task.setId("t1");
        Board board = boardWithId("b1", "p1");
        Project project = projectWithId("p1");
        project.setDeleted(true);

        when(taskRepository.findById("t1")).thenReturn(Optional.of(task));
        when(boardRepository.findById("b1")).thenReturn(Optional.of(board));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));

        UpdateTaskPositionRequest request = mock(UpdateTaskPositionRequest.class);
        when(request.getTaskId()).thenReturn("t1");

        assertThatThrownBy(() -> boardService.updateTaskPosition(request, "u1"))
                .isInstanceOf(com.devsync.common.ResourceNotFoundException.class);
        verify(taskRepository, never()).save(any());
    }

    @Test
    void updateTaskPosition_shouldThrow_WhenTaskNotFound() {
        when(taskRepository.findById("ghost")).thenReturn(Optional.empty());

        UpdateTaskPositionRequest request = mock(UpdateTaskPositionRequest.class);
        when(request.getTaskId()).thenReturn("ghost");

        assertThatThrownBy(() -> boardService.updateTaskPosition(request, "u1"))
                .isInstanceOf(com.devsync.common.ResourceNotFoundException.class);
        verify(taskRepository, never()).save(any());
    }

    @Test
    void updateTaskPosition_shouldThrow_WhenDestinationColumnNotFound() {
        Task task = Task.builder().boardId("b1").columnId("c1").title("T").build();
        task.setId("t1");
        Board board = boardWithId("b1", "p1");
        Project project = projectWithId("p1");
        ProjectMember member = ProjectMember.builder()
                .projectId("p1").userId("member1").role(ProjectMember.Role.MEMBER).build();

        when(taskRepository.findById("t1")).thenReturn(Optional.of(task));
        when(boardRepository.findById("b1")).thenReturn(Optional.of(board));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(projectMemberRepository.findByProjectIdAndUserId("p1", "member1"))
                .thenReturn(Optional.of(member));
        when(columnRepository.findById("c-missing")).thenReturn(Optional.empty());

        UpdateTaskPositionRequest request = mock(UpdateTaskPositionRequest.class);
        when(request.getTaskId()).thenReturn("t1");
        when(request.getNewColumnId()).thenReturn("c-missing");

        assertThatThrownBy(() -> boardService.updateTaskPosition(request, "member1"))
                .isInstanceOf(com.devsync.common.ResourceNotFoundException.class);
        verify(taskRepository, never()).save(any());
    }

    // ── Create board ─────────────────────────────────────────

    @Test
    void createBoard_shouldThrow_WhenProjectArchived() {
        Project project = projectWithId("p1");
        project.setStatus(Project.ProjectStatus.ARCHIVED);
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> boardService.createBoard("Board", "p1", "owner1", java.util.List.of("To Do")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("archived");
        verify(boardRepository, never()).save(any());
    }

    @Test
    void createBoard_shouldThrow_WhenProjectDeleted() {
        Project project = projectWithId("p1");
        project.setDeleted(true);
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> boardService.createBoard("Board", "p1", "owner1", java.util.List.of("To Do")))
                .isInstanceOf(com.devsync.common.ResourceNotFoundException.class);
        verify(boardRepository, never()).save(any());
    }

    @Test
    void createBoard_shouldThrow_WhenProjectMissing() {
        when(projectRepository.findById("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> boardService.createBoard("Board", "ghost", "owner1", java.util.List.of("To Do")))
                .isInstanceOf(com.devsync.common.ResourceNotFoundException.class);
        verify(boardRepository, never()).save(any());
    }

    @Test
    void createBoard_shouldSucceed_WhenMember() {
        Project project = projectWithId("p1");
        ProjectMember member = ProjectMember.builder()
                .projectId("p1").userId("member1").role(ProjectMember.Role.MEMBER).build();
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(projectMemberRepository.findByProjectIdAndUserId("p1", "member1"))
                .thenReturn(Optional.of(member));
        when(boardRepository.save(any(Board.class))).thenAnswer(inv -> {
            Board b = inv.getArgument(0);
            b.setId("b-new");
            return b;
        });
        when(columnRepository.findByBoardIdOrderByPositionAsc(anyString())).thenReturn(java.util.List.of());

        BoardResponse response = boardService.createBoard("Board", "p1", "member1", java.util.List.of("To Do", "Done"));

        org.assertj.core.api.Assertions.assertThat(response.getId()).isEqualTo("b-new");
        verify(columnRepository, org.mockito.Mockito.times(2)).save(any(BoardColumn.class));
    }

    @Test
    void createBoard_shouldThrow_WhenNonMember() {
        Project project = projectWithId("p1");
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(projectMemberRepository.findByProjectIdAndUserId("p1", "stranger"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> boardService.createBoard("Board", "p1", "stranger", java.util.List.of("To Do")))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        verify(boardRepository, never()).save(any());
    }

    @Test
    void createBoard_shouldThrow_WhenViewer() {
        Project project = projectWithId("p1");
        ProjectMember viewer = ProjectMember.builder()
                .projectId("p1").userId("viewer1").role(ProjectMember.Role.VIEWER).build();
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(projectMemberRepository.findByProjectIdAndUserId("p1", "viewer1"))
                .thenReturn(Optional.of(viewer));

        assertThatThrownBy(() -> boardService.createBoard("Board", "p1", "viewer1", java.util.List.of("To Do")))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class)
                .hasMessageContaining("Viewers cannot modify");
        verify(boardRepository, never()).save(any());
    }

    // ── Task position / cross-board protection ───────────────

    @Test
    void updateTaskPosition_shouldThrow_WhenNonMember() {
        Task task = Task.builder().boardId("b1").columnId("c1").title("T").build();
        task.setId("t1");
        Board board = boardWithId("b1", "p1");
        Project project = projectWithId("p1");

        when(taskRepository.findById("t1")).thenReturn(Optional.of(task));
        when(boardRepository.findById("b1")).thenReturn(Optional.of(board));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(projectMemberRepository.findByProjectIdAndUserId("p1", "stranger"))
                .thenReturn(Optional.empty());

        UpdateTaskPositionRequest request = mock(UpdateTaskPositionRequest.class);
        when(request.getTaskId()).thenReturn("t1");

        assertThatThrownBy(() -> boardService.updateTaskPosition(request, "stranger"))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        verify(taskRepository, never()).save(any());
    }

    @Test
    void updateTaskPosition_shouldThrow_WhenColumnBelongsToAnotherBoard() {
        Task task = Task.builder().boardId("b1").columnId("c1").title("T").build();
        task.setId("t1");
        Board board = boardWithId("b1", "p1");
        Project project = projectWithId("p1");
        ProjectMember member = ProjectMember.builder()
                .projectId("p1").userId("member1").role(ProjectMember.Role.MEMBER).build();
        // The destination column belongs to a DIFFERENT board (project p2).
        BoardColumn foreignColumn = columnWithId("c-other", "b-other");

        when(taskRepository.findById("t1")).thenReturn(Optional.of(task));
        when(boardRepository.findById("b1")).thenReturn(Optional.of(board));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(projectMemberRepository.findByProjectIdAndUserId("p1", "member1"))
                .thenReturn(Optional.of(member));
        when(columnRepository.findById("c-other")).thenReturn(Optional.of(foreignColumn));

        UpdateTaskPositionRequest request = mock(UpdateTaskPositionRequest.class);
        when(request.getTaskId()).thenReturn("t1");
        when(request.getNewColumnId()).thenReturn("c-other");

        assertThatThrownBy(() -> boardService.updateTaskPosition(request, "member1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("another board");
        verify(taskRepository, never()).save(any());
    }

    @Test
    void getTaskDto_shouldThrow_WhenNonMember() {
        Task task = Task.builder().boardId("b1").title("T").build();
        task.setId("t1");
        Board board = boardWithId("b1", "p1");
        Project project = projectWithId("p1");
        when(taskRepository.findById("t1")).thenReturn(Optional.of(task));
        when(boardRepository.findById("b1")).thenReturn(Optional.of(board));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(userRepository.findById("stranger")).thenReturn(Optional.empty());
        when(projectMemberRepository.existsByProjectIdAndUserId("p1", "stranger")).thenReturn(false);

        assertThatThrownBy(() -> boardService.getTaskDto("t1", "stranger"))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
    }

    private BoardColumn columnWithId(String id, String boardId) {
        BoardColumn col = BoardColumn.builder().boardId(boardId).name("Done").position(0).build();
        col.setId(id);
        return col;
    }

    private Board boardWithId(String id, String projectId) {
        Board board = Board.builder().name("Board").projectId(projectId).createdBy("owner1").build();
        board.setId(id);
        return board;
    }

    private Project projectWithId(String id) {
        Project project = Project.builder().name("DevSync").ownerId("owner1").build();
        project.setId(id);
        return project;
    }
}
