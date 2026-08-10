package com.devsync.report;

import com.devsync.audit.entity.AuditAction;
import com.devsync.audit.repository.AuditLogRepository;
import com.devsync.feed.entity.Post;
import com.devsync.feed.repository.PostRepository;
import com.devsync.message.entity.Message;
import com.devsync.message.repository.MessageRepository;
import com.devsync.project.entity.Project;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.report.entity.Report;
import com.devsync.report.repository.ReportRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end integration tests for the report + moderation flow against the
 * real services and an H2 database (no service mocking).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ReportModerationIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private ProjectRepository projectRepository;
    @Autowired private PostRepository postRepository;
    @Autowired private MessageRepository messageRepository;
    @Autowired private ReportRepository reportRepository;
    @Autowired private AuditLogRepository auditLogRepository;

    private String reporterId;
    private String targetUserId;
    private String projectId;
    private String postId;
    private String messageId;

    @BeforeEach
    void seed() {
        reportRepository.deleteAll();
        auditLogRepository.deleteAll();
        messageRepository.deleteAll();
        postRepository.deleteAll();
        projectRepository.deleteAll();
        userRepository.deleteAll();

        reporterId = createUser("reporter@test.com", User.Role.USER).getId();
        targetUserId = createUser("target@test.com", User.Role.USER).getId();
        String ownerId = createUser("owner@test.com", User.Role.USER).getId();

        Project project = projectRepository.save(Project.builder()
                .name("Reported Project").ownerId(ownerId).build());
        projectId = project.getId();

        Post post = postRepository.save(Post.builder()
                .userId(ownerId).content("Reported post content").build());
        postId = post.getId();

        Message message = messageRepository.save(Message.builder()
                .senderId(ownerId).content("Reported message").roomId("room-1").build());
        messageId = message.getId();
    }

    private User createUser(String email, User.Role role) {
        return userRepository.save(User.builder()
                .email(email)
                .password("$2a$10$abcdefghijklmnopqrstuv")
                .fullName("User " + email)
                .username(email.split("@")[0])
                .role(role)
                .emailVerified(true)
                .authProvider("email")
                .build());
    }

    private String reportJson(String entityType, String entityId, String reason) {
        return "{\"entityType\":\"" + entityType + "\",\"entityId\":\"" + entityId
                + "\",\"reason\":\"" + reason + "\"}";
    }

    // ---------- Report creation ----------

    @Test
    void createReport_shouldSucceed_ForAuthenticatedUser() throws Exception {
        mockMvc.perform(post("/api/reports")
                        .with(user(reporterId).roles("USER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reportJson("USER", targetUserId, "HARASSMENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.entityType").value("USER"));
    }

    @Test
    void createReport_shouldReject_DuplicateSubmission() throws Exception {
        mockMvc.perform(post("/api/reports")
                        .with(user(reporterId).roles("USER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reportJson("USER", targetUserId, "SPAM")))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/reports")
                        .with(user(reporterId).roles("USER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reportJson("USER", targetUserId, "ABUSE")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("You have already reported this user"));
    }

    @Test
    void createReport_shouldReject_NonexistentEntity() throws Exception {
        mockMvc.perform(post("/api/reports")
                        .with(user(reporterId).roles("USER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reportJson("PROJECT", "missing-project", "SPAM")))
                .andExpect(status().isNotFound());
    }

    @Test
    void createReport_shouldRequireAuthentication() throws Exception {
        mockMvc.perform(post("/api/reports")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reportJson("USER", targetUserId, "SPAM")))
                .andExpect(status().isUnauthorized());
    }

    // ---------- Report review / status transitions ----------

    @Test
    void reviewReport_shouldFollowValidTransitions_AndRejectTerminalChanges() throws Exception {
        Report report = reportRepository.save(Report.builder()
                .reporterId(reporterId).entityType(ReportEntityType.USER)
                .entityId(targetUserId).reason(ReportReason.HARASSMENT)
                .status(ReportStatus.PENDING).build());

        // PENDING -> UNDER_REVIEW
        mockMvc.perform(put("/api/admin/reports/" + report.getId() + "/review")
                        .with(user("admin-1").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"UNDER_REVIEW\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UNDER_REVIEW"));

        // UNDER_REVIEW -> RESOLVED
        mockMvc.perform(put("/api/admin/reports/" + report.getId() + "/review")
                        .with(user("admin-1").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"RESOLVED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"));

        // RESOLVED -> REJECTED is not allowed (terminal state)
        mockMvc.perform(put("/api/admin/reports/" + report.getId() + "/review")
                        .with(user("admin-1").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"REJECTED\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Cannot transition report from RESOLVED to REJECTED"));
    }

    @Test
    void reviewReport_shouldReject_BackToPending() throws Exception {
        Report report = reportRepository.save(Report.builder()
                .reporterId(reporterId).entityType(ReportEntityType.POST)
                .entityId(postId).reason(ReportReason.INAPPROPRIATE_CONTENT)
                .status(ReportStatus.UNDER_REVIEW).build());

        mockMvc.perform(put("/api/admin/reports/" + report.getId() + "/review")
                        .with(user("admin-1").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PENDING\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void adminReportEndpoints_shouldRequireAdminRole() throws Exception {
        mockMvc.perform(get("/api/admin/reports"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/admin/reports")
                        .with(user(reporterId).roles("USER")))
                .andExpect(status().isForbidden());
    }

    // ---------- Moderation actions ----------

    @Test
    void moderate_blockUser_shouldApplyAndAudit() throws Exception {
        Report report = reportRepository.save(Report.builder()
                .reporterId(reporterId).entityType(ReportEntityType.USER)
                .entityId(targetUserId).reason(ReportReason.HARASSMENT)
                .status(ReportStatus.PENDING).build());

        mockMvc.perform(put("/api/admin/reports/" + report.getId() + "/moderate")
                        .with(user("admin-1").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"action\":\"BLOCK_USER\"}"))
                .andExpect(status().isOk());

        assertThat(userRepository.findById(targetUserId).orElseThrow().isBlocked()).isTrue();
        assertThat(auditLogRepository.findAll())
                .anyMatch(log -> log.getAction() == AuditAction.USER_BLOCKED
                        && targetUserId.equals(log.getTargetUser()));
    }

    @Test
    void moderate_hidePost_shouldApplyAndAudit() throws Exception {
        Report report = reportRepository.save(Report.builder()
                .reporterId(reporterId).entityType(ReportEntityType.POST)
                .entityId(postId).reason(ReportReason.INAPPROPRIATE_CONTENT)
                .status(ReportStatus.PENDING).build());

        mockMvc.perform(put("/api/admin/reports/" + report.getId() + "/moderate")
                        .with(user("admin-1").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"action\":\"HIDE_POST\"}"))
                .andExpect(status().isOk());

        assertThat(postRepository.findById(postId).orElseThrow().isHidden()).isTrue();
        assertThat(auditLogRepository.findAll())
                .anyMatch(log -> log.getAction() == AuditAction.MODERATION_ACTION
                        && log.getDetails() != null && log.getDetails().contains("Hidden post " + postId));
    }

    @Test
    void moderate_hideMessage_shouldApplyAndAudit() throws Exception {
        Report report = reportRepository.save(Report.builder()
                .reporterId(reporterId).entityType(ReportEntityType.MESSAGE)
                .entityId(messageId).reason(ReportReason.SPAM)
                .status(ReportStatus.PENDING).build());

        mockMvc.perform(put("/api/admin/reports/" + report.getId() + "/moderate")
                        .with(user("admin-1").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"action\":\"HIDE_MESSAGE\"}"))
                .andExpect(status().isOk());

        assertThat(messageRepository.findById(messageId).orElseThrow().isHidden()).isTrue();
    }

    @Test
    void moderate_shouldReject_InvalidActionForEntityType() throws Exception {
        Report projectReport = reportRepository.save(Report.builder()
                .reporterId(reporterId).entityType(ReportEntityType.PROJECT)
                .entityId(projectId).reason(ReportReason.SPAM)
                .status(ReportStatus.PENDING).build());

        mockMvc.perform(put("/api/admin/reports/" + projectReport.getId() + "/moderate")
                        .with(user("admin-1").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"action\":\"HIDE_POST\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Action HIDE_POST is not valid for project reports"));
    }

    @Test
    void moderate_shouldReject_NonexistentComment() throws Exception {
        Report commentReport = reportRepository.save(Report.builder()
                .reporterId(reporterId).entityType(ReportEntityType.COMMENT)
                .entityId("missing-comment").reason(ReportReason.ABUSE)
                .status(ReportStatus.PENDING).build());

        mockMvc.perform(put("/api/admin/reports/" + commentReport.getId() + "/moderate")
                        .with(user("admin-1").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"action\":\"DELETE_COMMENT\"}"))
                .andExpect(status().isNotFound());
    }

    // ---------- Project moderation ----------

    @Test
    void projectModeration_archiveRestoreVisibilityDelete() throws Exception {
        // Archive
        mockMvc.perform(put("/api/admin/projects/" + projectId + "/archive")
                        .with(user("admin-1").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ARCHIVED"));
        assertThat(projectRepository.findById(projectId).orElseThrow().getStatus())
                .isEqualTo(Project.ProjectStatus.ARCHIVED);

        // Restore
        mockMvc.perform(put("/api/admin/projects/" + projectId + "/restore")
                        .with(user("admin-1").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        // Visibility change
        mockMvc.perform(put("/api/admin/projects/" + projectId + "/visibility")
                        .with(user("admin-1").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"visibility\":\"PRIVATE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.visibility").value("PRIVATE"));

        // Soft delete
        mockMvc.perform(delete("/api/admin/projects/" + projectId)
                        .with(user("admin-1").roles("ADMIN")))
                .andExpect(status().isNoContent());
        assertThat(projectRepository.findById(projectId).orElseThrow().isDeleted()).isTrue();
    }

    @Test
    void projectModeration_shouldBeAdminOnly() throws Exception {
        mockMvc.perform(delete("/api/admin/projects/" + projectId)
                        .with(user(reporterId).roles("USER")))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/admin/projects/" + projectId + "/archive")
                        .with(user(reporterId).roles("USER")))
                .andExpect(status().isForbidden());
    }
}