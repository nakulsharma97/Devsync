package com.devsync.analytics;

import com.devsync.activity.repository.ActivityRepository;
import com.devsync.analytics.dto.AdminAnalyticsResponse;
import com.devsync.analytics.dto.ProjectAnalyticsResponse;
import com.devsync.feed.repository.CommentRepository;
import com.devsync.feed.repository.PostRepository;
import com.devsync.kanban.entity.Board;
import com.devsync.kanban.entity.BoardColumn;
import com.devsync.kanban.entity.Task;
import com.devsync.kanban.repository.BoardColumnRepository;
import com.devsync.kanban.repository.BoardRepository;
import com.devsync.kanban.repository.TaskRepository;
import com.devsync.message.repository.MessageRepository;
import com.devsync.project.entity.Project;
import com.devsync.project.repository.ProjectMemberRepository;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.report.repository.ReportRepository;
import com.devsync.teamroom.repository.TeamRoomRepository;
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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTest {

    @Mock private ProjectRepository projectRepository;
    @Mock private ProjectMemberRepository memberRepository;
    @Mock private BoardRepository boardRepository;
    @Mock private BoardColumnRepository columnRepository;
    @Mock private TaskRepository taskRepository;
    @Mock private TeamRoomRepository teamRoomRepository;
    @Mock private MessageRepository messageRepository;
    @Mock private PostRepository postRepository;
    @Mock private CommentRepository commentRepository;
    @Mock private ActivityRepository activityRepository;
    @Mock private ReportRepository reportRepository;
    @Mock private UserRepository userRepository;

    private AnalyticsService analyticsService;

    @BeforeEach
    void setUp() {
        analyticsService = new AnalyticsService(projectRepository, memberRepository, boardRepository,
                columnRepository, taskRepository, teamRoomRepository, messageRepository,
                postRepository, commentRepository, activityRepository, reportRepository, userRepository);
    }

    @Test
    void getProjectAnalytics_shouldThrow_WhenNotMember() {
        Project project = Project.builder().name("DevSync").ownerId("owner1").build();
        project.setId("p1");
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(userRepository.findById("u1")).thenReturn(Optional.empty());
        when(memberRepository.existsByProjectIdAndUserId("p1", "u1")).thenReturn(false);

        assertThatThrownBy(() -> analyticsService.getProjectAnalytics("p1", "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not a member");
    }

    @Test
    void getProjectAnalytics_shouldAggregateStats() {
        Project project = Project.builder().name("DevSync").ownerId("owner1").build();
        project.setId("p1");
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));

        Board board = Board.builder().name("Board").projectId("p1").createdBy("owner1").build();
        board.setId("board1");
        when(boardRepository.findByProjectId("p1")).thenReturn(List.of(board));

        BoardColumn done = BoardColumn.builder().boardId("board1").name("Done").position(2).build();
        done.setId("doneCol");
        BoardColumn todo = BoardColumn.builder().boardId("board1").name("To Do").position(0).build();
        todo.setId("todoCol");
        when(columnRepository.findByBoardIdIn(Set.of("board1"))).thenReturn(List.of(done, todo));

        Task t1 = Task.builder().title("Done task").columnId("doneCol").boardId("board1").position(0).build();
        t1.setId("t1");
        Task t2 = Task.builder().title("Pending").columnId("todoCol").boardId("board1").position(0).build();
        t2.setId("t2");
        t2.setDueDate(Instant.now().minusSeconds(3600));
        when(taskRepository.findByBoardIdIn(Set.of("board1"))).thenReturn(List.of(t1, t2));

        when(memberRepository.countByProjectId("p1")).thenReturn(4L);
        when(teamRoomRepository.findByProjectId("p1")).thenReturn(List.of());
        when(memberRepository.findByProjectId("p1")).thenReturn(List.of());

        ProjectAnalyticsResponse response = analyticsService.getProjectAnalytics("p1", "owner1");

        assertThat(response.getTotalMembers()).isEqualTo(4);
        assertThat(response.getCompletedTasks()).isEqualTo(1);
        assertThat(response.getPendingTasks()).isEqualTo(1);
        assertThat(response.getOverdueTasks()).isEqualTo(1);
        assertThat(response.getCompletionPercentage()).isEqualTo(50);
        assertThat(response.getActivityTrend()).hasSize(14);
    }

    @Test
    void getAdminAnalytics_shouldAggregateCounts() {
        when(userRepository.count()).thenReturn(100L);
        when(projectRepository.countByDeletedFalse()).thenReturn(10L);
        when(taskRepository.count()).thenReturn(500L);
        when(messageRepository.count()).thenReturn(2000L);
        when(postRepository.count()).thenReturn(300L);
        when(reportRepository.count()).thenReturn(25L);

        AdminAnalyticsResponse response = analyticsService.getAdminAnalytics();

        assertThat(response.getTotalUsers()).isEqualTo(100);
        assertThat(response.getTotalProjects()).isEqualTo(10);
        assertThat(response.getTotalTasks()).isEqualTo(500);
        assertThat(response.getTotalMessages()).isEqualTo(2000);
        assertThat(response.getTotalPosts()).isEqualTo(300);
        assertThat(response.getTotalReports()).isEqualTo(25);
        assertThat(response.getUserGrowth()).hasSize(12);
        assertThat(response.getTaskCompletionTrend()).hasSize(14);
    }

    @Test
    void getUserContributions_shouldThrow_WhenUserMissing() {
        when(userRepository.existsById("x1")).thenReturn(false);
        assertThatThrownBy(() -> analyticsService.getUserContributions("x1"))
                .isInstanceOf(com.devsync.common.ResourceNotFoundException.class);
    }
}
