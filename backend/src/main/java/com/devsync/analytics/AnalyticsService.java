package com.devsync.analytics;

import com.devsync.activity.entity.ActivityType;
import com.devsync.activity.repository.ActivityRepository;
import com.devsync.analytics.dto.AdminAnalyticsResponse;
import com.devsync.analytics.dto.ProjectAnalyticsResponse;
import com.devsync.analytics.dto.TrendPoint;
import com.devsync.analytics.dto.UserContributionsResponse;
import com.devsync.common.ResourceNotFoundException;
import com.devsync.feed.repository.CommentRepository;
import com.devsync.feed.repository.PostRepository;
import com.devsync.kanban.entity.Board;
import com.devsync.kanban.entity.BoardColumn;
import com.devsync.kanban.entity.Task;
import com.devsync.kanban.repository.BoardColumnRepository;
import com.devsync.kanban.repository.BoardRepository;
import com.devsync.kanban.repository.TaskRepository;
import com.devsync.message.repository.MessageRepository;
import com.devsync.presence.PresenceStatus;
import com.devsync.project.entity.Project;
import com.devsync.project.entity.ProjectMember;
import com.devsync.project.repository.ProjectMemberRepository;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.report.repository.ReportRepository;
import com.devsync.teamroom.entity.TeamRoom;
import com.devsync.teamroom.repository.TeamRoomRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.BiFunction;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private static final int TREND_DAYS = 14;
    private static final int GROWTH_MONTHS = 12;
    private static final int HEATMAP_DAYS = 84;

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;
    private final BoardRepository boardRepository;
    private final BoardColumnRepository columnRepository;
    private final TaskRepository taskRepository;
    private final TeamRoomRepository teamRoomRepository;
    private final MessageRepository messageRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final ActivityRepository activityRepository;
    private final ReportRepository reportRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public ProjectAnalyticsResponse getProjectAnalytics(String projectId, String userId) {
        Project project = projectRepository.findById(projectId)
                .filter(p -> !p.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
        if (!canView(project, userId)) {
            throw new IllegalArgumentException("You are not a member of this project");
        }

        List<Board> boards = boardRepository.findByProjectId(projectId);
        Set<String> boardIds = boards.stream().map(Board::getId).collect(Collectors.toSet());
        List<Task> tasks = boardIds.isEmpty() ? List.of() : taskRepository.findByBoardIdIn(boardIds);
        List<BoardColumn> columns = boardIds.isEmpty() ? List.of() : columnRepository.findByBoardIdIn(boardIds);
        Set<String> doneColumnIds = columns.stream()
                .filter(c -> isDone(c.getName()))
                .map(BoardColumn::getId)
                .collect(Collectors.toSet());

        long completed = tasks.stream().filter(t -> doneColumnIds.contains(t.getColumnId())).count();
        List<Task> pending = tasks.stream().filter(t -> !doneColumnIds.contains(t.getColumnId())).toList();
        long overdue = pending.stream()
                .filter(t -> t.getDueDate() != null && t.getDueDate().isBefore(Instant.now()))
                .count();
        int completionPct = tasks.isEmpty() ? 0 : (int) Math.round(completed * 100.0 / tasks.size());
        Map<String, Long> tasksPerMember = tasks.stream()
                .filter(t -> t.getAssigneeId() != null)
                .collect(Collectors.groupingBy(Task::getAssigneeId, Collectors.counting()));

        List<String> roomIds = teamRoomRepository.findByProjectId(projectId).stream()
                .map(TeamRoom::getId).toList();
        long messagesSent = roomIds.isEmpty() ? 0 : messageRepository.countByRoomIdIn(roomIds);
        List<String> memberUserIds = memberRepository.findByProjectId(projectId).stream()
                .map(ProjectMember::getUserId).toList();
        long postsCreated = memberUserIds.isEmpty() ? 0 : postRepository.countByUserIdIn(memberUserIds);

        return ProjectAnalyticsResponse.builder()
                .projectId(projectId)
                .totalMembers(memberRepository.countByProjectId(projectId))
                .completedTasks(completed)
                .pendingTasks(pending.size())
                .overdueTasks(overdue)
                .completionPercentage(completionPct)
                .tasksPerMember(tasksPerMember)
                .messagesSent(messagesSent)
                .postsCreated(postsCreated)
                .activityTrend(dailySeries((start, end) ->
                        activityRepository.countByProjectIdAndCreatedAtBetween(projectId, start, end), TREND_DAYS))
                .build();
    }

    @Transactional(readOnly = true)
    public AdminAnalyticsResponse getAdminAnalytics() {
        Instant since30 = Instant.now().minus(Duration.ofDays(30));
        return AdminAnalyticsResponse.builder()
                .totalUsers(userRepository.count())
                .activeUsers(userRepository.countActiveUsers(since30))
                .blockedUsers(userRepository.countByBlockedTrue())
                .totalProjects(projectRepository.countByDeletedFalse())
                .privateProjects(projectRepository.countByVisibilityAndDeletedFalse(Project.ProjectVisibility.PRIVATE))
                .publicProjects(projectRepository.countByVisibilityAndDeletedFalse(Project.ProjectVisibility.PUBLIC))
                .totalTasks(taskRepository.count())
                .totalMessages(messageRepository.count())
                .totalPosts(postRepository.count())
                .totalReports(reportRepository.count())
                .activeSessions(userRepository.countByPresenceStatus(PresenceStatus.ONLINE))
                .userGrowth(monthlySeries(userRepository::countByCreatedAtBetween, GROWTH_MONTHS))
                .projectGrowth(monthlySeries(projectRepository::countByCreatedAtBetween, GROWTH_MONTHS))
                .taskCompletionTrend(dailySeries((start, end) ->
                        activityRepository.countByActivityTypeAndCreatedAtBetween(ActivityType.TASK_COMPLETED, start, end), TREND_DAYS))
                .dailyActivity(dailySeries(activityRepository::countByCreatedAtBetween, TREND_DAYS))
                .reportsTrend(dailySeries(reportRepository::countByCreatedAtBetween, TREND_DAYS))
                .build();
    }

    @Transactional(readOnly = true)
    public UserContributionsResponse getUserContributions(String userId) {
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("User", userId);
        }
        List<Instant> activityAts = activityRepository.findCreatedAtsSince(userId, Instant.now().minus(Duration.ofDays(180)));
        Set<LocalDate> activeDays = activityAts.stream()
                .map(at -> at.atZone(ZoneOffset.UTC).toLocalDate())
                .collect(Collectors.toSet());

        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        int streak = 0;
        LocalDate day = today;
        while (activeDays.contains(day)) {
            streak++;
            day = day.minusDays(1);
        }

        Map<LocalDate, Long> counts = activityAts.stream()
                .collect(Collectors.groupingBy(at -> at.atZone(ZoneOffset.UTC).toLocalDate(), Collectors.counting()));
        List<TrendPoint> heatmap = new ArrayList<>();
        for (int i = HEATMAP_DAYS - 1; i >= 0; i--) {
            LocalDate d = today.minusDays(i);
            heatmap.add(TrendPoint.builder().date(d.toString()).count(counts.getOrDefault(d, 0L)).build());
        }

        return UserContributionsResponse.builder()
                .projectsCreated(projectRepository.countByOwnerId(userId))
                .tasksCompleted(activityRepository.countByUserIdAndActivityType(userId, ActivityType.TASK_COMPLETED))
                .messagesSent(messageRepository.countMessagesByUserId(userId))
                .postsCreated(postRepository.countByUserId(userId))
                .commentsAdded(commentRepository.countByUserId(userId))
                .currentStreak(streak)
                .monthlyActivity(monthlySeries((start, end) ->
                        activityRepository.countByUserIdAndCreatedAtBetween(userId, start, end), GROWTH_MONTHS))
                .heatmap(heatmap)
                .build();
    }

    private boolean canView(Project project, String userId) {
        if (project.getOwnerId().equals(userId)) return true;
        User user = userRepository.findById(userId).orElse(null);
        if (user != null && user.getRole() == User.Role.ADMIN) return true;
        return memberRepository.existsByProjectIdAndUserId(project.getId(), userId);
    }

    private boolean isDone(String columnName) {
        String n = columnName == null ? "" : columnName.toLowerCase();
        return n.contains("done") || n.contains("complete");
    }

    private List<TrendPoint> dailySeries(BiFunction<Instant, Instant, Long> counter, int days) {
        List<TrendPoint> points = new ArrayList<>();
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        for (int i = days - 1; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            Instant start = day.atStartOfDay().toInstant(ZoneOffset.UTC);
            Instant end = day.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);
            points.add(TrendPoint.builder().date(day.toString()).count(counter.apply(start, end)).build());
        }
        return points;
    }

    private List<TrendPoint> monthlySeries(BiFunction<Instant, Instant, Long> counter, int months) {
        List<TrendPoint> points = new ArrayList<>();
        YearMonth current = YearMonth.now(ZoneOffset.UTC);
        for (int i = months - 1; i >= 0; i--) {
            YearMonth ym = current.minusMonths(i);
            Instant start = ym.atDay(1).atStartOfDay().toInstant(ZoneOffset.UTC);
            Instant end = ym.plusMonths(1).atDay(1).atStartOfDay().toInstant(ZoneOffset.UTC);
            points.add(TrendPoint.builder().date(ym.toString()).count(counter.apply(start, end)).build());
        }
        return points;
    }
}
