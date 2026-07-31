package com.devsync.report;

import com.devsync.common.ResourceNotFoundException;
import com.devsync.feed.entity.Post;
import com.devsync.feed.repository.CommentRepository;
import com.devsync.feed.repository.PostRepository;
import com.devsync.message.entity.Message;
import com.devsync.message.repository.MessageRepository;
import com.devsync.project.entity.Project;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.report.dto.CreateReportRequest;
import com.devsync.report.dto.ReportResponse;
import com.devsync.report.entity.Report;
import com.devsync.report.repository.ReportRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock private ReportRepository reportRepository;
    @Mock private UserRepository userRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private PostRepository postRepository;
    @Mock private CommentRepository commentRepository;
    @Mock private MessageRepository messageRepository;

    @Captor private ArgumentCaptor<Report> reportCaptor;

    private ReportService reportService;

    @BeforeEach
    void setUp() {
        reportService = new ReportService(reportRepository, userRepository, projectRepository,
                postRepository, commentRepository, messageRepository);
    }

    private CreateReportRequest request(String entityType, String entityId, String reason) {
        CreateReportRequest req = new CreateReportRequest();
        req.setEntityType(entityType);
        req.setEntityId(entityId);
        req.setReason(reason);
        req.setDescription("Offensive content");
        return req;
    }

    @Test
    void createReport_shouldSaveAndReturnResponse_ForUserReport() {
        when(userRepository.existsById("u2")).thenReturn(true);
        when(reportRepository.existsByReporterIdAndEntityTypeAndEntityId("u1", ReportEntityType.USER, "u2"))
                .thenReturn(false);
        when(reportRepository.save(any(Report.class))).thenAnswer(inv -> {
            Report r = inv.getArgument(0);
            r.setId("r1");
            r.setCreatedAt(Instant.now());
            return r;
        });

        ReportResponse response = reportService.createReport("u1", request("USER", "u2", "HARASSMENT"));

        assertThat(response.getId()).isEqualTo("r1");
        assertThat(response.getEntityType()).isEqualTo("USER");
        assertThat(response.getReason()).isEqualTo("HARASSMENT");
        assertThat(response.getStatus()).isEqualTo("PENDING");
        verify(reportRepository).save(reportCaptor.capture());
        assertThat(reportCaptor.getValue().getReporterId()).isEqualTo("u1");
        assertThat(reportCaptor.getValue().getStatus()).isEqualTo(ReportStatus.PENDING);
    }

    @Test
    void createReport_shouldThrow_WhenDuplicate() {
        when(userRepository.existsById("u2")).thenReturn(true);
        when(reportRepository.existsByReporterIdAndEntityTypeAndEntityId("u1", ReportEntityType.USER, "u2"))
                .thenReturn(true);

        assertThatThrownBy(() -> reportService.createReport("u1", request("USER", "u2", "SPAM")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already reported");

        verify(reportRepository, never()).save(any());
    }

    @Test
    void createReport_shouldValidateEntityExists_ForEachType() {
        // PROJECT
        when(projectRepository.existsById("p1")).thenReturn(false);
        assertThatThrownBy(() -> reportService.createReport("u1", request("PROJECT", "p1", "SPAM")))
                .isInstanceOf(ResourceNotFoundException.class);

        // POST
        when(postRepository.existsById("post1")).thenReturn(false);
        assertThatThrownBy(() -> reportService.createReport("u1", request("POST", "post1", "SPAM")))
                .isInstanceOf(ResourceNotFoundException.class);

        // COMMENT
        when(commentRepository.existsById("c1")).thenReturn(false);
        assertThatThrownBy(() -> reportService.createReport("u1", request("COMMENT", "c1", "SPAM")))
                .isInstanceOf(ResourceNotFoundException.class);

        // MESSAGE
        when(messageRepository.existsById("m1")).thenReturn(false);
        assertThatThrownBy(() -> reportService.createReport("u1", request("MESSAGE", "m1", "SPAM")))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(reportRepository, never()).save(any());
    }

    @Test
    void createReport_shouldThrow_ForInvalidEntityType() {
        assertThatThrownBy(() -> reportService.createReport("u1", request("GADGET", "x1", "SPAM")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid entity type");
    }

    @Test
    void createReport_shouldThrow_ForInvalidReason() {
        when(userRepository.existsById("u2")).thenReturn(true);
        assertThatThrownBy(() -> reportService.createReport("u1", request("USER", "u2", "BOGUS")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid reason");
    }
}
