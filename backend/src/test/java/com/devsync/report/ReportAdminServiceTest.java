package com.devsync.report;

import com.devsync.activity.ActivityService;
import com.devsync.activity.entity.ActivityType;
import com.devsync.admin.AdminService;
import com.devsync.audit.AuditLogService;
import com.devsync.audit.entity.AuditAction;
import com.devsync.audit.entity.AuditStatus;
import com.devsync.common.PageResponse;
import com.devsync.common.ResourceNotFoundException;
import com.devsync.feed.entity.Post;
import com.devsync.feed.repository.CommentRepository;
import com.devsync.feed.repository.PostRepository;
import com.devsync.message.entity.Message;
import com.devsync.message.repository.MessageRepository;
import com.devsync.notification.NotificationService;
import com.devsync.project.entity.Project;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.report.dto.AdminReportDetail;
import com.devsync.report.dto.AdminReportListItem;
import com.devsync.report.dto.AdminReportStats;
import com.devsync.report.entity.Report;
import com.devsync.report.repository.ReportRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReportAdminServiceTest {

    @Mock private ReportRepository reportRepository;
    @Mock private UserRepository userRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private PostRepository postRepository;
    @Mock private CommentRepository commentRepository;
    @Mock private MessageRepository messageRepository;
    @Mock private AdminService adminService;
    @Mock private AuditLogService auditLogService;
    @Mock private ActivityService activityService;
    @Mock private NotificationService notificationService;

    private ReportAdminService service;

    @BeforeEach
    void setUp() {
        service = new ReportAdminService(reportRepository, userRepository, projectRepository,
                postRepository, commentRepository, messageRepository,
                adminService, auditLogService, activityService, notificationService);
    }

    private Report report(String id, String reporterId, ReportEntityType type, String entityId, ReportStatus status) {
        Report r = Report.builder()
                .reporterId(reporterId)
                .entityType(type)
                .entityId(entityId)
                .reason(ReportReason.SPAM)
                .status(status)
                .build();
        r.setId(id);
        r.setCreatedAt(Instant.now());
        r.setUpdatedAt(Instant.now());
        return r;
    }

    private User user(String id, String name) {
        User u = User.builder().email(id + "@test.com").fullName(name).username("user" + id).build();
        u.setId(id);
        return u;
    }

    @Test
    void getReportsPage_shouldReturnPagedItems_WithBatchLoadedReportersAndTitles() {
        Report r1 = report("r1", "reporter1", ReportEntityType.USER, "u2", ReportStatus.PENDING);
        when(reportRepository.searchAdminReports(isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(r1), PageRequest.of(0, 10), 1));
        // reporterMap() runs first, then entityTitles() for the USER entity -> sequential returns
        when(userRepository.findAllById(anySet()))
                .thenReturn(List.of(user("reporter1", "Reporter One")), List.of(user("u2", "Reported User")));

        PageResponse<AdminReportListItem> result = service.getReportsPage(0, 10, null, null, null, null, null, null, null, null);

        assertThat(result.getContent()).hasSize(1);
        AdminReportListItem item = result.getContent().get(0);
        assertThat(item.getId()).isEqualTo("r1");
        assertThat(item.getReporter().getFullName()).isEqualTo("Reporter One");
        assertThat(item.getEntityTitle()).isEqualTo("Reported User");
        assertThat(item.getStatus()).isEqualTo("PENDING");
    }

    @Test
    void getReportDetail_shouldIncludeReviewerInfo() {
        Report r = report("r1", "reporter1", ReportEntityType.POST, "post1", ReportStatus.RESOLVED);
        r.setReviewedBy("admin1");
        r.setReviewedAt(Instant.now());
        when(reportRepository.findById("r1")).thenReturn(Optional.of(r));
        when(userRepository.findById("reporter1")).thenReturn(Optional.of(user("reporter1", "Reporter One")));
        when(userRepository.findById("admin1")).thenReturn(Optional.of(user("admin1", "Admin One")));
        Post post = Post.builder().userId("u2").content("Bad content").build();
        post.setId("post1");
        when(postRepository.findById("post1")).thenReturn(Optional.of(post));
        when(userRepository.findById("u2")).thenReturn(Optional.of(user("u2", "Post Author")));

        AdminReportDetail detail = service.getReportDetail("r1");

        assertThat(detail.getStatus()).isEqualTo("RESOLVED");
        assertThat(detail.getReviewedByName()).isEqualTo("Admin One");
        assertThat(detail.getEntityTitle()).isEqualTo("Bad content");
        assertThat(detail.getEntityOwnerName()).isEqualTo("Post Author");
    }

    @Test
    void getReportDetail_shouldThrow_WhenNotFound() {
        when(reportRepository.findById("ghost")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getReportDetail("ghost"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getStats_shouldReturnAllCounts() {
        when(reportRepository.count()).thenReturn(10L);
        when(reportRepository.countByStatus(ReportStatus.PENDING)).thenReturn(5L);
        when(reportRepository.countByStatus(ReportStatus.UNDER_REVIEW)).thenReturn(2L);
        when(reportRepository.countByStatus(ReportStatus.RESOLVED)).thenReturn(2L);
        when(reportRepository.countByStatus(ReportStatus.REJECTED)).thenReturn(1L);

        AdminReportStats stats = service.getStats();

        assertThat(stats.getTotal()).isEqualTo(10);
        assertThat(stats.getPending()).isEqualTo(5);
        assertThat(stats.getUnderReview()).isEqualTo(2);
        assertThat(stats.getResolved()).isEqualTo(2);
        assertThat(stats.getRejected()).isEqualTo(1);
    }

    @Test
    void reviewReport_shouldSetStatusAndNotifyReporter_WhenResolved() {
        Report r = report("r1", "reporter1", ReportEntityType.USER, "u2", ReportStatus.PENDING);
        when(reportRepository.findById("r1")).thenReturn(Optional.of(r));
        when(reportRepository.save(any(Report.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById("admin1")).thenReturn(Optional.of(user("admin1", "Admin One")));
        when(userRepository.findById("reporter1")).thenReturn(Optional.of(user("reporter1", "Reporter One")));
        when(userRepository.findById("u2")).thenReturn(Optional.of(user("u2", "Reported User")));

        service.reviewReport("r1", "RESOLVED", "admin1");

        assertThat(r.getStatus()).isEqualTo(ReportStatus.RESOLVED);
        assertThat(r.getReviewedBy()).isEqualTo("admin1");
        assertThat(r.getReviewedAt()).isNotNull();
        verify(notificationService).createNotification(eq("reporter1"), eq("REPORT"), anyString(), anyString(),
                eq("admin1"), anyString(), any(), eq("r1"), eq("report"), eq("/reports"));
    }

    @Test
    void reviewReport_shouldNotNotify_WhenUnderReview() {
        Report r = report("r1", "reporter1", ReportEntityType.USER, "u2", ReportStatus.PENDING);
        when(reportRepository.findById("r1")).thenReturn(Optional.of(r));
        when(reportRepository.save(any(Report.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById("reporter1")).thenReturn(Optional.of(user("reporter1", "Reporter One")));
        when(userRepository.findById("u2")).thenReturn(Optional.of(user("u2", "Reported User")));

        service.reviewReport("r1", "UNDER_REVIEW", "admin1");

        verify(notificationService, never()).createNotification(anyString(), anyString(), anyString(), anyString(),
                anyString(), anyString(), any(), anyString(), anyString(), anyString());
    }

    @Test
    void reviewReport_shouldThrow_WhenBackToPending() {
        Report r = report("r1", "reporter1", ReportEntityType.USER, "u2", ReportStatus.PENDING);
        when(reportRepository.findById("r1")).thenReturn(Optional.of(r));

        assertThatThrownBy(() -> service.reviewReport("r1", "PENDING", "admin1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("PENDING");
    }

    @Test
    void moderate_shouldBlockUser_ForUserReport() {
        Report r = report("r1", "reporter1", ReportEntityType.USER, "u2", ReportStatus.PENDING);
        when(reportRepository.findById("r1")).thenReturn(Optional.of(r));
        when(userRepository.findById("reporter1")).thenReturn(Optional.of(user("reporter1", "Reporter One")));
        when(userRepository.findById("u2")).thenReturn(Optional.of(user("u2", "Reported User")));

        service.moderate("r1", "BLOCK_USER", null, "admin1");

        verify(adminService).setUserBlocked("u2", true, "admin1", null);
    }

    @Test
    void moderate_shouldHidePost_ForPostReport() {
        Report r = report("r1", "reporter1", ReportEntityType.POST, "post1", ReportStatus.PENDING);
        when(reportRepository.findById("r1")).thenReturn(Optional.of(r));
        Post post = Post.builder().userId("u2").content("Bad").build();
        post.setId("post1");
        when(postRepository.findById("post1")).thenReturn(Optional.of(post));
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById("reporter1")).thenReturn(Optional.of(user("reporter1", "Reporter One")));
        when(userRepository.findById("u2")).thenReturn(Optional.of(user("u2", "Post Author")));

        service.moderate("r1", "HIDE_POST", null, "admin1");

        assertThat(post.isHidden()).isTrue();
        verify(postRepository).save(post);
    }

    @Test
    void moderate_shouldThrow_WhenActionMismatchesEntityType() {
        Report r = report("r1", "reporter1", ReportEntityType.USER, "u2", ReportStatus.PENDING);
        when(reportRepository.findById("r1")).thenReturn(Optional.of(r));

        assertThatThrownBy(() -> service.moderate("r1", "HIDE_POST", null, "admin1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not valid");
    }

    @Test
    void moderate_shouldThrow_WhenActionValidForTypeButEntityMissing() {
        Report commentReport = report("r1", "reporter1", ReportEntityType.COMMENT, "c1", ReportStatus.PENDING);
        when(reportRepository.findById("r1")).thenReturn(Optional.of(commentReport));
        when(commentRepository.existsById("c1")).thenReturn(false);

        assertThatThrownBy(() -> service.moderate("r1", "DELETE_COMMENT", null, "admin1"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Comment");
    }

    @Test
    void moderate_setVisibility_shouldToggle_WhenNoValueProvided() {
        Report projectReport = report("r1", "reporter1", ReportEntityType.PROJECT, "p1", ReportStatus.PENDING);
        when(reportRepository.findById("r1")).thenReturn(Optional.of(projectReport));
        Project publicProject = Project.builder().name("DevSync").ownerId("u2")
                .visibility(Project.ProjectVisibility.PUBLIC).build();
        publicProject.setId("p1");
        when(projectRepository.findById("p1")).thenReturn(Optional.of(publicProject));

        service.moderate("r1", "SET_VISIBILITY", null, "admin1");

        verify(adminService).setProjectVisibility("p1", "PRIVATE", "admin1");
    }

    @Test
    void moderate_deleteComment_shouldRecordAudit() {
        Report commentReport = report("r1", "reporter1", ReportEntityType.COMMENT, "c1", ReportStatus.PENDING);
        when(reportRepository.findById("r1")).thenReturn(Optional.of(commentReport));
        when(commentRepository.existsById("c1")).thenReturn(true);

        service.moderate("r1", "DELETE_COMMENT", null, "admin1");

        verify(commentRepository).deleteById("c1");
        verify(auditLogService).record(eq("admin1"), eq("reporter1"), eq(AuditAction.MODERATION_ACTION),
                eq(AuditStatus.SUCCESS), contains("Deleted comment c1"));
    }

    @Test
    void moderate_hideMessage_shouldRecordAudit() {
        Report messageReport = report("r1", "reporter1", ReportEntityType.MESSAGE, "m1", ReportStatus.PENDING);
        when(reportRepository.findById("r1")).thenReturn(Optional.of(messageReport));
        Message msg = Message.builder().senderId("u2").content("Spam").build();
        msg.setId("m1");
        when(messageRepository.findById("m1")).thenReturn(Optional.of(msg));
        when(messageRepository.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));

        service.moderate("r1", "HIDE_MESSAGE", null, "admin1");

        assertThat(msg.isHidden()).isTrue();
        verify(auditLogService).record(eq("admin1"), eq("reporter1"), eq(AuditAction.MODERATION_ACTION),
                eq(AuditStatus.SUCCESS), contains("Hidden message m1"));
    }

    @Test
    void reviewReport_toResolved_shouldRecordExactlyOneAuditAndOneActivity() {
        Report r = report("r1", "reporter1", ReportEntityType.USER, "u2", ReportStatus.PENDING);
        when(reportRepository.findById("r1")).thenReturn(Optional.of(r));
        when(reportRepository.save(any(Report.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById("admin1")).thenReturn(Optional.of(user("admin1", "Admin One")));
        when(userRepository.findById("reporter1")).thenReturn(Optional.of(user("reporter1", "Reporter One")));
        when(userRepository.findById("u2")).thenReturn(Optional.of(user("u2", "Reported User")));

        service.reviewReport("r1", "RESOLVED", "admin1");

        verify(auditLogService, times(1)).record(eq("admin1"), eq("reporter1"),
                eq(AuditAction.MODERATION_ACTION), eq(AuditStatus.SUCCESS), contains("resolved"));
        verify(activityService, times(1)).record(eq("admin1"), isNull(), eq(ActivityType.REPORT_RESOLVED),
                eq("Report resolved"), anyString(), eq("r1"));
        verify(auditLogService, never()).record(eq("admin1"), eq("reporter1"),
                eq(AuditAction.MODERATION_ACTION), eq(AuditStatus.SUCCESS), contains("rejected"));
    }

    @Test
    void reviewReport_toRejected_shouldRecordExactlyOneAuditAndOneActivity() {
        Report r = report("r1", "reporter1", ReportEntityType.PROJECT, "p1", ReportStatus.UNDER_REVIEW);
        when(reportRepository.findById("r1")).thenReturn(Optional.of(r));
        when(reportRepository.save(any(Report.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById("admin1")).thenReturn(Optional.of(user("admin1", "Admin One")));
        when(userRepository.findById("reporter1")).thenReturn(Optional.of(user("reporter1", "Reporter One")));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(Project.builder().name("P").ownerId("u2").build()));
        when(userRepository.findById("u2")).thenReturn(Optional.of(user("u2", "Project Owner")));

        service.reviewReport("r1", "REJECTED", "admin1");

        verify(auditLogService, times(1)).record(eq("admin1"), eq("reporter1"),
                eq(AuditAction.MODERATION_ACTION), eq(AuditStatus.SUCCESS), contains("rejected"));
        verify(activityService, times(1)).record(eq("admin1"), isNull(), eq(ActivityType.REPORT_REJECTED),
                eq("Report rejected"), anyString(), eq("r1"));
    }

    @Test
    void reviewReport_toUnderReview_shouldRecordNoAuditOrActivity() {
        Report r = report("r1", "reporter1", ReportEntityType.USER, "u2", ReportStatus.PENDING);
        when(reportRepository.findById("r1")).thenReturn(Optional.of(r));
        when(reportRepository.save(any(Report.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById("reporter1")).thenReturn(Optional.of(user("reporter1", "Reporter One")));
        when(userRepository.findById("u2")).thenReturn(Optional.of(user("u2", "Reported User")));

        service.reviewReport("r1", "UNDER_REVIEW", "admin1");

        verify(auditLogService, never()).record(anyString(), any(), any(), any(), anyString());
        verify(activityService, never()).record(anyString(), any(), any(), anyString(), anyString(), anyString());
    }

    @Test
    void reviewReport_shouldReject_TransitionFromTerminalState() {
        Report resolved = report("r1", "reporter1", ReportEntityType.USER, "u2", ReportStatus.RESOLVED);
        when(reportRepository.findById("r1")).thenReturn(Optional.of(resolved));

        assertThatThrownBy(() -> service.reviewReport("r1", "REJECTED", "admin1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Cannot transition report from RESOLVED to REJECTED");

        verify(reportRepository, never()).save(any());
    }

    @Test
    void reviewReport_shouldReject_BackToPending() {
        Report underReview = report("r1", "reporter1", ReportEntityType.USER, "u2", ReportStatus.UNDER_REVIEW);
        when(reportRepository.findById("r1")).thenReturn(Optional.of(underReview));

        assertThatThrownBy(() -> service.reviewReport("r1", "PENDING", "admin1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("PENDING");
    }

    @Test
    void reviewReport_shouldAllow_PendingToResolved() {
        Report pending = report("r1", "reporter1", ReportEntityType.USER, "u2", ReportStatus.PENDING);
        when(reportRepository.findById("r1")).thenReturn(Optional.of(pending));
        when(reportRepository.save(any(Report.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById("admin1")).thenReturn(Optional.of(user("admin1", "Admin One")));
        when(userRepository.findById("reporter1")).thenReturn(Optional.of(user("reporter1", "Reporter One")));
        when(userRepository.findById("u2")).thenReturn(Optional.of(user("u2", "Reported User")));

        service.reviewReport("r1", "RESOLVED", "admin1");

        assertThat(pending.getStatus()).isEqualTo(ReportStatus.RESOLVED);
        assertThat(pending.getReviewedBy()).isEqualTo("admin1");
    }
}
