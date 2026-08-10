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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
        List<BoardColumn> columns = boardIds.isEmpty() ? List.of() : columnRepository.findByBoardIdIn(boardIds);
        Set<String> doneColumnIds = columns.stream()
                .filter(c -> isDone(c.getName()))
                .map(BoardColumn::getId)
                .collect(Collectors.toSet());

        // All task statistics are aggregated in the database - never loaded into memory.
        long total = boardIds.isEmpty() ? 0 : taskRepository.countByBoardIdIn(boardIds);
        long completed = doneColumnIds.isEmpty() ? 0 : taskRepository.countByColumnIdIn(doneColumnIds);
        long pending = total - completed;
        long overdue;
        if (total == 0) {
            overdue = 0;
        } else if (doneColumnIds.isEmpty()) {
            overdue = taskRepository.countByBoardIdInAndDueDateBefore(boardIds, Instant.now());
        } else {
            overdue = taskRepository.countByBoardIdInAndColumnIdNotInAndDueDateBefore(
                    boardIds, doneColumnIds, Instant.now());
        }
        int completionPct = total == 0 ? 0 : (int) Math.round(completed * 100.0 / total);
        Map<String, Long> tasksPerMember = boardIds.isEmpty()
                ? Map.of()
                : taskRepository.countGroupedByAssignee(boardIds).stream()
                        .collect(Collectors.toMap(row -> (String) row[0], row -> (Long) row[1]));

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
                .pendingTasks(pending)
                .overdueTasks(overdue)
                .completionPercentage(completionPct)
                .tasksPerMember(tasksPerMember)
                .messagesSent(messagesSent)
                .postsCreated(postsCreated)
                .activityTrend(dailySeries(toDayMap(activityRepository.countGroupedByDay(
                        startOfDayMinusDays(TREND_DAYS - 1L), startOfDayPlusDays(1))), TREND_DAYS))
                .build();
    }

    @Transactional(readOnly = true)
    public AdminAnalyticsResponse getAdminAnalytics() {
        Instant since30 = Instant.now().minus(Duration.ofDays(30));
        Instant trendStart = startOfDayMinusDays(TREND_DAYS - 1L);
        Instant trendEnd = startOfDayPlusDays(1);
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
                .userGrowth(monthlySeries(toMonthMap(userRepository.countGroupedByDay(
                        startOfMonth(-(GROWTH_MONTHS - 1)), startOfMonth(1))), GROWTH_MONTHS))
                .projectGrowth(monthlySeries(toMonthMap(projectRepository.countGroupedByDay(
                        startOfMonth(-(GROWTH_MONTHS - 1)), startOfMonth(1))), GROWTH_MONTHS))
                .taskCompletionTrend(dailySeries(toDayMap(activityRepository.countGroupedByDayAndType(
                        ActivityType.TASK_COMPLETED, trendStart, trendEnd)), TREND_DAYS))
                .dailyActivity(dailySeries(toDayMap(activityRepository.countGroupedByDay(trendStart, trendEnd)), TREND_DAYS))
                .reportsTrend(dailySeries(toDayMap(reportRepository.countGroupedByDay(trendStart, trendEnd)), TREND_DAYS))
                .build();
    }

    @Transactional(readOnly = true)
    public UserContributionsResponse getUserContributions(String userId) {
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("User", userId);
        }
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        Instant heatmapStart = today.minusDays(HEATMAP_DAYS - 1L).atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant heatmapEnd = today.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);

        // Single GROUP BY query per heatmap window instead of loading all activity rows.
        Map<LocalDate, Long> dayCounts = toDayMap(
                activityRepository.countGroupedByDayForUser(userId, heatmapStart, heatmapEnd));

        int streak = 0;
        LocalDate day = today;
        while (dayCounts.containsKey(day)) {
            streak++;
            day = day.minusDays(1);
        }

        List<TrendPoint> heatmap = new ArrayList<>();
        for (int i = HEATMAP_DAYS - 1; i >= 0; i--) {
            LocalDate d = today.minusDays(i);
            heatmap.add(TrendPoint.builder().date(d.toString()).count(dayCounts.getOrDefault(d, 0L)).build());
        }

        return UserContributionsResponse.builder()
                .projectsCreated(projectRepository.countByOwnerId(userId))
                .tasksCompleted(activityRepository.countByUserIdAndActivityType(userId, ActivityType.TASK_COMPLETED))
                .messagesSent(messageRepository.countMessagesByUserId(userId))
                .postsCreated(postRepository.countByUserId(userId))
                .commentsAdded(commentRepository.countByUserId(userId))
                .currentStreak(streak)
                .monthlyActivity(monthlySeries(toMonthMap(activityRepository.countGroupedByDayForUser(
                        userId, startOfMonth(-(GROWTH_MONTHS - 1)), startOfMonth(1))), GROWTH_MONTHS))
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

    /**
     * Builds a zero-filled daily series from a single grouped-by-day query result.
     * One query for the whole window instead of one COUNT per day.
     */
    private List<TrendPoint> dailySeries(Map<LocalDate, Long> counts, int days) {
        List<TrendPoint> points = new ArrayList<>();
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        for (int i = days - 1; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            points.add(TrendPoint.builder().date(day.toString()).count(counts.getOrDefault(day, 0L)).build());
        }
        return points;
    }

    /** Builds a zero-filled monthly series from a single grouped-by-day query result. */
    private List<TrendPoint> monthlySeries(Map<YearMonth, Long> counts, int months) {
        List<TrendPoint> points = new ArrayList<>();
        YearMonth current = YearMonth.now(ZoneOffset.UTC);
        for (int i = months - 1; i >= 0; i--) {
            YearMonth ym = current.minusMonths(i);
            points.add(TrendPoint.builder().date(ym.toString()).count(counts.getOrDefault(ym, 0L)).build());
        }
        return points;
    }

    private Map<LocalDate, Long> toDayMap(List<Object[]> rows) {
        Map<LocalDate, Long> map = new HashMap<>();
        for (Object[] row : rows) {
            if (row == null || row.length < 2 || row[0] == null) continue;
            map.put(toLocalDate(row[0]), (Long) row[1]);
        }
        return map;
    }

    private Map<YearMonth, Long> toMonthMap(List<Object[]> rows) {
        Map<YearMonth, Long> map = new HashMap<>();
        for (Object[] row : rows) {
            if (row == null || row.length < 2 || row[0] == null) continue;
            map.put(YearMonth.from(toLocalDate(row[0])), (Long) row[1]);
        }
        return map;
    }

    private LocalDate toLocalDate(Object value) {
        if (value instanceof java.sql.Date sqlDate) return sqlDate.toLocalDate();
        if (value instanceof LocalDate localDate) return localDate;
        return LocalDate.parse(String.valueOf(value));
    }

    private Instant startOfDayMinusDays(long days) {
        return LocalDate.now(ZoneOffset.UTC).minusDays(days).atStartOfDay().toInstant(ZoneOffset.UTC);
    }

    private Instant startOfDayPlusDays(long days) {
        return LocalDate.now(ZoneOffset.UTC).plusDays(days).atStartOfDay().toInstant(ZoneOffset.UTC);
    }

    private Instant startOfMonth(int offset) {
        YearMonth ym = YearMonth.now(ZoneOffset.UTC).plusMonths(offset);
        return ym.atDay(1).atStartOfDay().toInstant(ZoneOffset.UTC);
    }
}
