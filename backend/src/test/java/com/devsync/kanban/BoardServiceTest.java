package com.devsync.kanban;

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
import com.devsync.project.repository.ProjectMemberRepository;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

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

    private BoardService boardService;

    @BeforeEach
    void setUp() {
        boardService = new BoardService(boardRepository, columnRepository, taskRepository,
                userRepository, projectRepository, projectMemberRepository);
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

        BoardResponse.TaskDto dto = boardService.createTask(request, "u1");

        org.assertj.core.api.Assertions.assertThat(dto.getTitle()).isEqualTo("Build feature");
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

        assertThatThrownBy(() -> boardService.updateTaskPosition(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("archived");

        verify(taskRepository, never()).save(any());
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
