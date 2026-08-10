package com.devsync.analytics;

import com.devsync.activity.entity.Activity;
import com.devsync.activity.entity.ActivityType;
import com.devsync.activity.repository.ActivityRepository;
import com.devsync.project.entity.Project;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.report.ReportEntityType;
import com.devsync.report.ReportReason;
import com.devsync.report.entity.Report;
import com.devsync.report.repository.ReportRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class AnalyticsAggregationRepositoryTest {

    @Autowired
    private ActivityRepository activityRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private ProjectRepository projectRepository;
    @Autowired
    private ReportRepository reportRepository;
    @Autowired
    private EntityManager entityManager;

    private Instant dayStart(int daysAgo) {
        return LocalDate.now(ZoneOffset.UTC).minusDays(daysAgo).atStartOfDay().toInstant(ZoneOffset.UTC);
    }

    private Map<LocalDate, Long> toMap(List<Object[]> rows) {
        return rows.stream().collect(Collectors.toMap(
                r -> r[0] instanceof java.sql.Date sqlDate
                        ? sqlDate.toLocalDate()
                        : (LocalDate) r[0],
                r -> (Long) r[1]));
    }

    @Test
    void activityGroupedByDay_shouldAggregateAcrossDays() {
        // Three activities: two on day -2, one on day -1, none today.
        persist(activity(ActivityType.PROJECT_CREATED, dayStart(2).plusSeconds(10)));
        persist(activity(ActivityType.TASK_CREATED, dayStart(2).plusSeconds(20)));
        persist(activity(ActivityType.MESSAGE_SENT, dayStart(1).plusSeconds(30)));

        Instant from = dayStart(10);
        Instant to = dayStart(0).plusSeconds(86400);
        Map<LocalDate, Long> counts = toMap(activityRepository.countGroupedByDay(from, to));

        assertThat(counts.get(dayStart(2).atZone(ZoneOffset.UTC).toLocalDate())).isEqualTo(2);
        assertThat(counts.get(dayStart(1).atZone(ZoneOffset.UTC).toLocalDate())).isEqualTo(1);
        assertThat(counts.get(dayStart(0).atZone(ZoneOffset.UTC).toLocalDate())).isNull();
    }

    @Test
    void activityGroupedByDayAndType_shouldFilterByType() {
        persist(activity(ActivityType.TASK_COMPLETED, dayStart(1).plusSeconds(10)));
        persist(activity(ActivityType.TASK_MOVED, dayStart(1).plusSeconds(20)));

        Instant from = dayStart(10);
        Instant to = dayStart(0).plusSeconds(86400);
        Map<LocalDate, Long> counts = toMap(
                activityRepository.countGroupedByDayAndType(ActivityType.TASK_COMPLETED, from, to));

        assertThat(counts.get(dayStart(1).atZone(ZoneOffset.UTC).toLocalDate())).isEqualTo(1);
    }

    @Test
    void activityGroupedByDayForUser_shouldScopeToUser() {
        persist(activity(ActivityType.POST_CREATED, dayStart(1).plusSeconds(10)));
        Activity theirs = activity(ActivityType.POST_CREATED, dayStart(1).plusSeconds(20));
        theirs.setUserId("u2");
        persist(theirs);

        Instant from = dayStart(10);
        Instant to = dayStart(0).plusSeconds(86400);
        Map<LocalDate, Long> counts = toMap(activityRepository.countGroupedByDayForUser("u1", from, to));

        assertThat(counts.get(dayStart(1).atZone(ZoneOffset.UTC).toLocalDate())).isEqualTo(1);
    }

    @Test
    void userGroupedByDay_shouldAggregateRegistrations() {
        persist(userAt("u1@test.com", dayStart(5).plusSeconds(1)));
        persist(userAt("u2@test.com", dayStart(5).plusSeconds(2)));
        persist(userAt("u3@test.com", dayStart(3).plusSeconds(3)));

        Map<LocalDate, Long> counts = toMap(userRepository.countGroupedByDay(dayStart(10), dayStart(0).plusSeconds(86400)));

        assertThat(counts.get(dayStart(5).atZone(ZoneOffset.UTC).toLocalDate())).isEqualTo(2);
        assertThat(counts.get(dayStart(3).atZone(ZoneOffset.UTC).toLocalDate())).isEqualTo(1);
    }

    @Test
    void projectGroupedByDay_shouldAggregateCreations() {
        persist(projectAt("P1", dayStart(7).plusSeconds(1)));
        persist(projectAt("P2", dayStart(7).plusSeconds(2)));
        persist(projectAt("P3", dayStart(2).plusSeconds(3)));

        Map<LocalDate, Long> counts = toMap(projectRepository.countGroupedByDay(dayStart(10), dayStart(0).plusSeconds(86400)));

        assertThat(counts.get(dayStart(7).atZone(ZoneOffset.UTC).toLocalDate())).isEqualTo(2);
        assertThat(counts.get(dayStart(2).atZone(ZoneOffset.UTC).toLocalDate())).isEqualTo(1);
    }

    @Test
    void reportGroupedByDay_shouldAggregateReports() {
        persist(reportAt("r1", dayStart(4).plusSeconds(1)));
        persist(reportAt("r2", dayStart(4).plusSeconds(2)));

        Map<LocalDate, Long> counts = toMap(reportRepository.countGroupedByDay(dayStart(10), dayStart(0).plusSeconds(86400)));

        assertThat(counts.get(dayStart(4).atZone(ZoneOffset.UTC).toLocalDate())).isEqualTo(2);
    }

    @Test
    void groupedQueries_shouldReturnEmpty_WhenNoRows() {
        Instant from = dayStart(10);
        Instant to = dayStart(0).plusSeconds(86400);

        assertThat(activityRepository.countGroupedByDay(from, to)).isEmpty();
        assertThat(userRepository.countGroupedByDay(from, to)).isEmpty();
        assertThat(projectRepository.countGroupedByDay(from, to)).isEmpty();
        assertThat(reportRepository.countGroupedByDay(from, to)).isEmpty();
    }

    @Test
    void groupedQueries_shouldIgnoreRowsOutsideWindow() {
        persist(activity(ActivityType.PROJECT_CREATED, dayStart(30)));

        Map<LocalDate, Long> counts = toMap(activityRepository.countGroupedByDay(dayStart(10), dayStart(0).plusSeconds(86400)));

        assertThat(counts).isEmpty();
    }

    private Activity activity(ActivityType type, Instant createdAt) {
        Activity a = Activity.builder().userId("u1").activityType(type).title("Event").build();
        a.setCreatedAt(createdAt);
        return a;
    }

    private User userAt(String email, Instant createdAt) {
        User user = User.builder()
                .email(email).password("$2a$10$abcdefghijklmnopqrstuv")
                .fullName("Test User").username(email.split("@")[0])
                .emailVerified(true).authProvider("email").build();
        user.setCreatedAt(createdAt);
        return user;
    }

    private Project projectAt(String name, Instant createdAt) {
        Project project = Project.builder().name(name).ownerId("owner-1").build();
        project.setCreatedAt(createdAt);
        return project;
    }

    private Report reportAt(String idSuffix, Instant createdAt) {
        Report report = Report.builder()
                .reporterId("u1").entityType(ReportEntityType.USER).entityId("u2")
                .reason(ReportReason.SPAM).build();
        report.setCreatedAt(createdAt);
        return report;
    }

    /**
     * Inserts a row with an exact createdAt via native SQL. Native inserts bypass
     * JPA auditing (which would otherwise stamp createdAt with "now") and avoid
     * entity-lifecycle surprises, so the test owns the timestamps deterministically
     * while still exercising the real GROUP BY aggregation SQL.
     */
    private void persist(Object entity) {
        String id = java.util.UUID.randomUUID().toString();
        Instant createdAt = ((com.devsync.common.BaseEntity) entity).getCreatedAt();
        if (entity instanceof Activity a) {
            nativeInsert("INSERT INTO activities (id, user_id, activity_type, title, created_at, updated_at) " +
                    "VALUES (?, ?, ?, ?, ?, ?)",
                    id, a.getUserId(), a.getActivityType().name(), a.getTitle(), createdAt, createdAt);
        } else if (entity instanceof User u) {
            nativeInsert("INSERT INTO users (id, email, password, full_name, role, presence_status, blocked, deleted, created_at, updated_at) " +
                            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    id, u.getEmail(), u.getPassword(), u.getFullName(),
                    u.getRole().name(), u.getPresenceStatus().name(), u.isBlocked(), u.isDeleted(), createdAt, createdAt);
        } else if (entity instanceof Project p) {
            nativeInsert("INSERT INTO projects (id, name, owner_id, status, visibility, deleted, created_at, updated_at) " +
                            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    id, p.getName(), p.getOwnerId(),
                    p.getStatus().name(), p.getVisibility().name(), p.isDeleted(), createdAt, createdAt);
        } else if (entity instanceof Report r) {
            nativeInsert("INSERT INTO reports (id, reporter_id, entity_type, entity_id, reason, status, created_at, updated_at) " +
                            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    id, r.getReporterId(), r.getEntityType().name(), r.getEntityId(),
                    r.getReason().name(), r.getStatus().name(), createdAt, createdAt);
        } else {
            throw new IllegalArgumentException("Unsupported entity: " + entity.getClass());
        }
        entityManager.flush();
    }

    private void nativeInsert(String sql, Object... params) {
        var q = entityManager.createNativeQuery(sql);
        for (int i = 0; i < params.length; i++) {
            q.setParameter(i + 1, params[i]);
        }
        q.executeUpdate();
    }
}
