package com.devsync.analytics;

import com.devsync.activity.entity.ActivityType;
import com.devsync.activity.repository.ActivityRepository;
import com.devsync.analytics.dto.AdminAnalyticsResponse;
import com.devsync.analytics.dto.ProjectAnalyticsResponse;
import com.devsync.analytics.dto.UserContributionsResponse;
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

    private Project project(String id, String ownerId) {
        Project project = Project.builder().name("DevSync").ownerId(ownerId).build();
        project.setId(id);
        return project;
    }

    private Board board(String id, String projectId) {
        Board board = Board.builder().name("Board").projectId(projectId).createdBy("owner1").build();
        board.setId(id);
        return board;
    }

    private BoardColumn column(String id, String boardId, String name) {
        BoardColumn col = BoardColumn.builder().boardId(boardId).name(name).position(0).build();
        col.setId(id);
        return col;
    }

    private Object[] dayRow(int daysAgo, long count) {
        java.sql.Date date = java.sql.Date.valueOf(
                java.time.LocalDate.now(java.time.ZoneOffset.UTC).minusDays(daysAgo));
        return new Object[]{date, count};
    }

    // ── Project analytics ───────────────────────────────────────

    @Test
    void getProjectAnalytics_shouldThrow_WhenNotMember() {
        Project project = project("p1", "owner1");
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(userRepository.findById("u1")).thenReturn(Optional.empty());
        when(memberRepository.existsByProjectIdAndUserId("p1", "u1")).thenReturn(false);

        assertThatThrownBy(() -> analyticsService.getProjectAnalytics("p1", "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not a member");
    }

    @Test
    void getProjectAnalytics_shouldAggregateStats_ForKnownDataset() {
        Project project = project("p1", "owner1");
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(boardRepository.findByProjectId("p1")).thenReturn(List.of(board("board1", "p1")));
        when(columnRepository.findByBoardIdIn(Set.of("board1")))
                .thenReturn(List.of(column("doneCol", "board1", "Done"), column("todoCol", "board1", "To Do")));

        // 6 tasks: 3 done, 3 pending, 1 of the pending overdue. Two assigned to m1, one to m2.
        when(taskRepository.countByBoardIdIn(Set.of("board1"))).thenReturn(6L);
        when(taskRepository.countByColumnIdIn(Set.of("doneCol"))).thenReturn(3L);
        when(taskRepository.countByBoardIdInAndColumnIdNotInAndDueDateBefore(
                eq(Set.of("board1")), eq(Set.of("doneCol")), any(Instant.class))).thenReturn(1L);
        when(taskRepository.countGroupedByAssignee(Set.of("board1")))
                .thenReturn(List.of(new Object[]{"m1", 2L}, new Object[]{"m2", 1L}));

        when(memberRepository.countByProjectId("p1")).thenReturn(4L);
        when(teamRoomRepository.findByProjectId("p1")).thenReturn(List.of());
        when(memberRepository.findByProjectId("p1")).thenReturn(List.of());
        when(activityRepository.countGroupedByDay(any(Instant.class), any(Instant.class))).thenReturn(List.of());

        ProjectAnalyticsResponse response = analyticsService.getProjectAnalytics("p1", "owner1");

        assertThat(response.getTotalMembers()).isEqualTo(4);
        assertThat(response.getCompletedTasks()).isEqualTo(3);
        assertThat(response.getPendingTasks()).isEqualTo(3);
        assertThat(response.getOverdueTasks()).isEqualTo(1);
        assertThat(response.getCompletionPercentage()).isEqualTo(50);
        assertThat(response.getTasksPerMember()).containsEntry("m1", 2L).containsEntry("m2", 1L);
        assertThat(response.getActivityTrend()).hasSize(14);

        // All task stats come from DB aggregation - no task rows are loaded.
        verify(taskRepository, never()).findByBoardIdIn(anySet());
    }

    @Test
    void getProjectAnalytics_shouldHandleProjectWithoutDoneColumns() {
        Project project = project("p1", "owner1");
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(boardRepository.findByProjectId("p1")).thenReturn(List.of(board("board1", "p1")));
        // No column named done/complete.
        when(columnRepository.findByBoardIdIn(Set.of("board1")))
                .thenReturn(List.of(column("todoCol", "board1", "To Do")));

        when(taskRepository.countByBoardIdIn(Set.of("board1"))).thenReturn(5L);
        // completed = 0 (empty done set), overdue counts all overdue tasks.
        when(taskRepository.countByBoardIdInAndDueDateBefore(eq(Set.of("board1")), any(Instant.class))).thenReturn(2L);
        when(taskRepository.countGroupedByAssignee(Set.of("board1"))).thenReturn(List.of());

        when(memberRepository.countByProjectId("p1")).thenReturn(1L);
        when(teamRoomRepository.findByProjectId("p1")).thenReturn(List.of());
        when(memberRepository.findByProjectId("p1")).thenReturn(List.of());
        when(activityRepository.countGroupedByDay(any(Instant.class), any(Instant.class))).thenReturn(List.of());

        ProjectAnalyticsResponse response = analyticsService.getProjectAnalytics("p1", "owner1");

        assertThat(response.getCompletedTasks()).isZero();
        assertThat(response.getPendingTasks()).isEqualTo(5);
        assertThat(response.getOverdueTasks()).isEqualTo(2);
        assertThat(response.getCompletionPercentage()).isZero();
    }

    @Test
    void getProjectAnalytics_shouldHandleEmptyProject() {
        Project project = project("p1", "owner1");
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(boardRepository.findByProjectId("p1")).thenReturn(List.of());
        when(memberRepository.countByProjectId("p1")).thenReturn(0L);
        when(activityRepository.countGroupedByDay(any(Instant.class), any(Instant.class))).thenReturn(List.of());

        ProjectAnalyticsResponse response = analyticsService.getProjectAnalytics("p1", "owner1");

        assertThat(response.getTotalMembers()).isZero();
        assertThat(response.getCompletedTasks()).isZero();
        assertThat(response.getPendingTasks()).isZero();
        assertThat(response.getOverdueTasks()).isZero();
        assertThat(response.getCompletionPercentage()).isZero();
        assertThat(response.getTasksPerMember()).isEmpty();
        assertThat(response.getActivityTrend()).hasSize(14).allMatch(t -> t.getCount() == 0);
    }

    // ── Admin analytics ─────────────────────────────────────────

    @Test
    void getAdminAnalytics_shouldAggregateCounts_AndBuildTrendsFromGroupedQueries() {
        when(userRepository.count()).thenReturn(100L);
        when(userRepository.countActiveUsers(any(Instant.class))).thenReturn(60L);
        when(userRepository.countByBlockedTrue()).thenReturn(5L);
        when(projectRepository.countByDeletedFalse()).thenReturn(10L);
        when(projectRepository.countByVisibilityAndDeletedFalse(Project.ProjectVisibility.PRIVATE)).thenReturn(4L);
        when(projectRepository.countByVisibilityAndDeletedFalse(Project.ProjectVisibility.PUBLIC)).thenReturn(6L);
        when(taskRepository.count()).thenReturn(500L);
        when(messageRepository.count()).thenReturn(2000L);
        when(postRepository.count()).thenReturn(300L);
        when(reportRepository.count()).thenReturn(25L);
        when(userRepository.countByPresenceStatus(any())).thenReturn(12L);

        when(userRepository.countGroupedByDay(any(Instant.class), any(Instant.class)))
                .thenReturn(List.<Object[]>of(dayRow(30, 3L), dayRow(10, 5L)));
        when(projectRepository.countGroupedByDay(any(Instant.class), any(Instant.class)))
                .thenReturn(List.<Object[]>of(dayRow(20, 2L)));
        when(activityRepository.countGroupedByDay(any(Instant.class), any(Instant.class)))
                .thenReturn(List.<Object[]>of(dayRow(3, 7L)));
        when(activityRepository.countGroupedByDayAndType(eq(ActivityType.TASK_COMPLETED),
                any(Instant.class), any(Instant.class))).thenReturn(List.<Object[]>of(dayRow(1, 4L)));
        when(reportRepository.countGroupedByDay(any(Instant.class), any(Instant.class)))
                .thenReturn(List.<Object[]>of(dayRow(2, 1L)));

        AdminAnalyticsResponse response = analyticsService.getAdminAnalytics();

        assertThat(response.getTotalUsers()).isEqualTo(100);
        assertThat(response.getActiveUsers()).isEqualTo(60);
        assertThat(response.getBlockedUsers()).isEqualTo(5);
        assertThat(response.getTotalProjects()).isEqualTo(10);
        assertThat(response.getPrivateProjects()).isEqualTo(4);
        assertThat(response.getPublicProjects()).isEqualTo(6);
        assertThat(response.getTotalTasks()).isEqualTo(500);
        assertThat(response.getTotalMessages()).isEqualTo(2000);
        assertThat(response.getTotalPosts()).isEqualTo(300);
        assertThat(response.getTotalReports()).isEqualTo(25);
        assertThat(response.getActiveSessions()).isEqualTo(12);

        assertThat(response.getUserGrowth()).hasSize(12);
        assertThat(response.getProjectGrowth()).hasSize(12);
        assertThat(response.getDailyActivity()).hasSize(14);
        assertThat(response.getTaskCompletionTrend()).hasSize(14);
        assertThat(response.getReportsTrend()).hasSize(14);

        // One grouped query per series - no per-day COUNT loops.
        verify(userRepository, times(1)).countGroupedByDay(any(Instant.class), any(Instant.class));
        verify(projectRepository, times(1)).countGroupedByDay(any(Instant.class), any(Instant.class));
        verify(reportRepository, times(1)).countGroupedByDay(any(Instant.class), any(Instant.class));
        verify(activityRepository, times(1)).countGroupedByDay(any(Instant.class), any(Instant.class));
    }

    @Test
    void getAdminAnalytics_shouldReturnZeroFilledTrends_WhenNoData() {
        when(userRepository.count()).thenReturn(0L);
        when(projectRepository.countByDeletedFalse()).thenReturn(0L);
        when(taskRepository.count()).thenReturn(0L);
        when(messageRepository.count()).thenReturn(0L);
        when(postRepository.count()).thenReturn(0L);
        when(reportRepository.count()).thenReturn(0L);
        when(userRepository.countGroupedByDay(any(Instant.class), any(Instant.class))).thenReturn(List.of());
        when(projectRepository.countGroupedByDay(any(Instant.class), any(Instant.class))).thenReturn(List.of());
        when(activityRepository.countGroupedByDay(any(Instant.class), any(Instant.class))).thenReturn(List.of());
        when(activityRepository.countGroupedByDayAndType(eq(ActivityType.TASK_COMPLETED),
                any(Instant.class), any(Instant.class))).thenReturn(List.of());
        when(reportRepository.countGroupedByDay(any(Instant.class), any(Instant.class))).thenReturn(List.of());

        AdminAnalyticsResponse response = analyticsService.getAdminAnalytics();

        assertThat(response.getUserGrowth()).hasSize(12).allMatch(t -> t.getCount() == 0);
        assertThat(response.getProjectGrowth()).hasSize(12).allMatch(t -> t.getCount() == 0);
        assertThat(response.getDailyActivity()).hasSize(14).allMatch(t -> t.getCount() == 0);
        assertThat(response.getTaskCompletionTrend()).hasSize(14).allMatch(t -> t.getCount() == 0);
        assertThat(response.getReportsTrend()).hasSize(14).allMatch(t -> t.getCount() == 0);
    }

    // ── User contributions ──────────────────────────────────────

    @Test
    void getUserContributions_shouldThrow_WhenUserMissing() {
        when(userRepository.existsById("x1")).thenReturn(false);
        assertThatThrownBy(() -> analyticsService.getUserContributions("x1"))
                .isInstanceOf(com.devsync.common.ResourceNotFoundException.class);
    }

    @Test
    void getUserContributions_shouldComputeStreakAndHeatmap_FromGroupedRows() {
        when(userRepository.existsById("u1")).thenReturn(true);
        // Activity today and yesterday -> streak 2. A spike 5 days ago -> heatmap count.
        when(activityRepository.countGroupedByDayForUser(eq("u1"), any(Instant.class), any(Instant.class)))
                .thenReturn(List.<Object[]>of(dayRow(0, 3L), dayRow(1, 2L), dayRow(5, 9L)));
        when(projectRepository.countByOwnerId("u1")).thenReturn(2L);
        when(activityRepository.countByUserIdAndActivityType("u1", ActivityType.TASK_COMPLETED)).thenReturn(7L);
        when(messageRepository.countMessagesByUserId("u1")).thenReturn(40L);
        when(postRepository.countByUserId("u1")).thenReturn(5L);
        when(commentRepository.countByUserId("u1")).thenReturn(8L);

        UserContributionsResponse response = analyticsService.getUserContributions("u1");

        assertThat(response.getProjectsCreated()).isEqualTo(2);
        assertThat(response.getTasksCompleted()).isEqualTo(7);
        assertThat(response.getMessagesSent()).isEqualTo(40);
        assertThat(response.getPostsCreated()).isEqualTo(5);
        assertThat(response.getCommentsAdded()).isEqualTo(8);
        assertThat(response.getCurrentStreak()).isEqualTo(2);
        assertThat(response.getHeatmap()).hasSize(84);
        // Heatmap is ordered oldest -> newest (84 entries), so day -5 is at index 78.
        assertThat(response.getHeatmap().get(78).getCount()).isEqualTo(9);
        assertThat(response.getMonthlyActivity()).hasSize(12);
    }

    @Test
    void getUserContributions_shouldReturnZeroStreakAndZeroHeatmap_WhenNoActivity() {
        when(userRepository.existsById("u1")).thenReturn(true);
        when(activityRepository.countGroupedByDayForUser(eq("u1"), any(Instant.class), any(Instant.class)))
                .thenReturn(List.of());
        when(projectRepository.countByOwnerId("u1")).thenReturn(0L);
        when(activityRepository.countByUserIdAndActivityType("u1", ActivityType.TASK_COMPLETED)).thenReturn(0L);
        when(messageRepository.countMessagesByUserId("u1")).thenReturn(0L);
        when(postRepository.countByUserId("u1")).thenReturn(0L);
        when(commentRepository.countByUserId("u1")).thenReturn(0L);

        UserContributionsResponse response = analyticsService.getUserContributions("u1");

        assertThat(response.getCurrentStreak()).isZero();
        assertThat(response.getHeatmap()).hasSize(84).allMatch(t -> t.getCount() == 0);
        assertThat(response.getMonthlyActivity()).hasSize(12).allMatch(t -> t.getCount() == 0);
    }
}
