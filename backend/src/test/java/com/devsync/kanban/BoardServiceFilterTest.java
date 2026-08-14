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
import com.devsync.project.entity.ProjectMember;
import com.devsync.project.repository.ProjectMemberRepository;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BoardServiceFilterTest {

    @Mock private BoardRepository boardRepository;
    @Mock private BoardColumnRepository columnRepository;
    @Mock private TaskRepository taskRepository;
    @Mock private TaskDependencyRepository dependencyRepository;
    @Mock private UserRepository userRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private ProjectMemberRepository projectMemberRepository;
    @Mock private ActivityService activityService;
    @Mock private NotificationService notificationService;

    private BoardService boardService;

    @BeforeEach
    void setUp() {
        boardService = new BoardService(boardRepository, columnRepository, taskRepository,
                dependencyRepository,
                userRepository, projectRepository, projectMemberRepository, activityService,
                notificationService);
    }

    @Test
    void filterTasks_shouldThrow_WhenNotMember() {
        Project project = Project.builder().name("DevSync").ownerId("owner1").build();
        project.setId("p1");
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(userRepository.findById("u1")).thenReturn(Optional.empty());
        when(projectMemberRepository.existsByProjectIdAndUserId("p1", "u1")).thenReturn(false);

        assertThatThrownBy(() -> boardService.filterTasks("p1", null, null, null, null, 0, 20, "u1"))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class)
                .hasMessageContaining("not a member");
    }

    @Test
    void filterTasks_shouldFilterByPriorityAndLabel() {
        Project project = Project.builder().name("DevSync").ownerId("owner1").build();
        project.setId("p1");
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));

        Board board = Board.builder().name("Board").projectId("p1").createdBy("owner1").build();
        board.setId("board1");
        when(boardRepository.findByProjectId("p1")).thenReturn(List.of(board));

        Task task = Task.builder().title("Fix bug").columnId("c1").boardId("board1").position(0).build();
        task.setId("t1");
        task.setPriority(Task.Priority.HIGH);
        task.setLabels("Bug,Frontend");
        when(taskRepository.findFilteredTasks(eq(List.of("board1")), eq(Task.Priority.HIGH),
                eq("Bug"), isNull(), isNull(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(task)));

        Page<BoardResponse.TaskDto> result =
                boardService.filterTasks("p1", "HIGH", "Bug", null, null, 0, 20, "owner1");

        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().get(0).getTitle()).isEqualTo("Fix bug");
        assertThat(result.getContent().get(0).getPriority()).isEqualTo("HIGH");
    }

    @Test
    void filterTasks_shouldReject_InvalidPriority() {
        Project project = Project.builder().name("DevSync").ownerId("owner1").build();
        project.setId("p1");
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> boardService.filterTasks("p1", "BOGUS", null, null, null, 0, 20, "owner1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid priority");
    }
}
