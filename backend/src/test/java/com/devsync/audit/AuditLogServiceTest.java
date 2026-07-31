package com.devsync.audit;

import com.devsync.audit.dto.AuditLogResponse;
import com.devsync.audit.entity.AuditAction;
import com.devsync.audit.entity.AuditLog;
import com.devsync.audit.entity.AuditStatus;
import com.devsync.audit.repository.AuditLogRepository;
import com.devsync.common.PageResponse;
import com.devsync.common.ResourceNotFoundException;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditLogServiceTest {

    @Mock private AuditLogRepository auditLogRepository;
    @Mock private UserRepository userRepository;

    @Captor private ArgumentCaptor<AuditLog> logCaptor;

    private AuditLogService auditLogService;

    @BeforeEach
    void setUp() {
        auditLogService = new AuditLogService(auditLogRepository, userRepository);
    }

    private AuditLog log(String id, String performedBy, String targetUser, AuditAction action) {
        AuditLog l = AuditLog.builder()
                .performedBy(performedBy).targetUser(targetUser)
                .action(action).status(AuditStatus.SUCCESS)
                .ipAddress("127.0.0.1").device("Desktop").browser("Chrome")
                .details("Test detail").build();
        l.setId(id);
        l.setCreatedAt(Instant.now());
        return l;
    }

    private User user(String id, String name) {
        User u = User.builder().email(id + "@test.com").fullName(name).build();
        u.setId(id);
        return u;
    }

    @Test
    void record_shouldPersistAuditLog() {
        when(auditLogRepository.save(any(AuditLog.class))).thenAnswer(inv -> inv.getArgument(0));

        auditLogService.record("admin1", "u1", AuditAction.USER_BLOCKED, AuditStatus.SUCCESS, "Blocked user");

        verify(auditLogRepository).save(logCaptor.capture());
        AuditLog saved = logCaptor.getValue();
        assertThat(saved.getPerformedBy()).isEqualTo("admin1");
        assertThat(saved.getTargetUser()).isEqualTo("u1");
        assertThat(saved.getAction()).isEqualTo(AuditAction.USER_BLOCKED);
        assertThat(saved.getStatus()).isEqualTo(AuditStatus.SUCCESS);
        assertThat(saved.getDetails()).isEqualTo("Blocked user");
        // No request context in unit tests
        assertThat(saved.getIpAddress()).isNull();
        assertThat(saved.getDevice()).isNull();
        assertThat(saved.getBrowser()).isNull();
    }

    @Test
    void getLogs_shouldReturnPagedResponses_WithBatchLoadedNames() {
        AuditLog l1 = log("l1", "admin1", "u1", AuditAction.ROLE_CHANGED);
        when(auditLogRepository.searchAdminLogs(
                isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(l1), PageRequest.of(0, 20), 1));
        when(userRepository.findAllById(anySet()))
                .thenReturn(List.of(user("admin1", "Admin One"), user("u1", "Target User")));

        PageResponse<AuditLogResponse> result =
                auditLogService.getLogs(0, 20, null, null, null, null, null, null, null, null, null);

        assertThat(result.getContent()).hasSize(1);
        AuditLogResponse item = result.getContent().get(0);
        assertThat(item.getAction()).isEqualTo("ROLE_CHANGED");
        assertThat(item.getStatus()).isEqualTo("SUCCESS");
        assertThat(item.getPerformedByName()).isEqualTo("Admin One");
        assertThat(item.getTargetUserName()).isEqualTo("Target User");
        assertThat(item.getIpAddress()).isEqualTo("127.0.0.1");
        // Batch-loaded, not individual lookups
        verify(userRepository).findAllById(anySet());
        verify(userRepository, never()).findById(anyString());
    }

    @Test
    void getLogs_shouldThrow_ForInvalidActionFilter() {
        assertThatThrownBy(() -> auditLogService.getLogs(0, 20, null, null, null, "BOGUS", null, null, null, null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid action filter");
    }

    @Test
    void getLogs_shouldThrow_ForInvalidStatusFilter() {
        assertThatThrownBy(() -> auditLogService.getLogs(0, 20, null, null, null, null, "BOGUS", null, null, null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid status filter");
    }

    @Test
    void getLog_shouldReturnDetail_WhenFound() {
        AuditLog l1 = log("l1", "admin1", "u1", AuditAction.LOGIN_SUCCESS);
        when(auditLogRepository.findById("l1")).thenReturn(Optional.of(l1));
        when(userRepository.findAllById(anySet())).thenReturn(List.of());

        AuditLogResponse response = auditLogService.getLog("l1");

        assertThat(response.getId()).isEqualTo("l1");
        assertThat(response.getAction()).isEqualTo("LOGIN_SUCCESS");
        assertThat(response.getStatus()).isEqualTo("SUCCESS");
    }

    @Test
    void getLog_shouldThrow_WhenNotFound() {
        when(auditLogRepository.findById("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> auditLogService.getLog("ghost"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void exportLogs_shouldReturnRows_AndToCsv_ShouldEscape() {
        AuditLog l1 = log("l1", "admin1", "u1", AuditAction.USER_DELETED);
        when(auditLogRepository.searchAdminLogs(
                isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(l1), PageRequest.of(0, 5000), 1));
        when(userRepository.findAllById(anySet()))
                .thenReturn(List.of(user("admin1", "Admin One"), user("u1", "Target User")));

        List<AuditLogResponse> rows = auditLogService.exportLogs(null, null, null, null, null, null, null);

        assertThat(rows).hasSize(1);
        String csv = auditLogService.toCsv(rows);
        assertThat(csv).contains("created_at");
        assertThat(csv).contains("USER_DELETED");
        assertThat(csv).contains("127.0.0.1");
        assertThat(csv).contains("Admin One");
    }
}
