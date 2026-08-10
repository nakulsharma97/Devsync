package com.devsync.collab;

import com.devsync.activity.ActivityService;
import com.devsync.collab.entity.JoinRequest;
import com.devsync.collab.entity.JoinRequestStatus;
import com.devsync.collab.repository.JoinRequestRepository;
import com.devsync.notification.NotificationService;
import com.devsync.project.entity.Project;
import com.devsync.project.entity.ProjectMember;
import com.devsync.project.repository.ProjectMemberRepository;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JoinRequestServiceTest {

    @Mock private JoinRequestRepository joinRequestRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private ProjectMemberRepository memberRepository;
    @Mock private UserRepository userRepository;
    @Mock private NotificationService notificationService;
    @Mock private ActivityService activityService;

    private JoinRequestService joinRequestService;
    private Project project;
    private User user;

    @BeforeEach
    void setUp() {
        joinRequestService = new JoinRequestService(joinRequestRepository, projectRepository,
                memberRepository, userRepository, notificationService, activityService);
        project = Project.builder().name("DevSync").ownerId("owner-1")
                .visibility(Project.ProjectVisibility.PUBLIC).build();
        project.setId("p1");
        user = User.builder().email("user@dev.com").fullName("User").build();
        user.setId("u1");
    }

    @Test
    void request_shouldJoinImmediately_WhenPublic() {
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(memberRepository.existsByProjectIdAndUserId("p1", "u1")).thenReturn(false);
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(memberRepository.findByProjectId("p1")).thenReturn(java.util.List.of());

        var response = joinRequestService.request("p1", "u1", null);

        assertThat(response.getStatus()).isEqualTo(JoinRequestStatus.APPROVED.name());
        verify(memberRepository).save(any(ProjectMember.class));
        verify(joinRequestRepository, never()).save(any());
    }

    @Test
    void request_shouldCreatePending_WhenPrivate() {
        project.setVisibility(Project.ProjectVisibility.PRIVATE);
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(memberRepository.existsByProjectIdAndUserId("p1", "u1")).thenReturn(false);
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(joinRequestRepository.existsByProjectIdAndUserId("p1", "u1")).thenReturn(false);
        when(joinRequestRepository.save(any(JoinRequest.class))).thenAnswer(inv -> {
            JoinRequest jr = inv.getArgument(0);
            jr.setId("jr-1");
            return jr;
        });
        when(memberRepository.findByProjectId("p1")).thenReturn(java.util.List.of());

        var response = joinRequestService.request("p1", "u1", null);

        assertThat(response.getStatus()).isEqualTo(JoinRequestStatus.PENDING.name());
        assertThat(response.getId()).isEqualTo("jr-1");
        verify(memberRepository, never()).save(any());
    }

    @Test
    void request_shouldThrow_WhenAlreadyMember() {
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(memberRepository.existsByProjectIdAndUserId("p1", "u1")).thenReturn(true);

        assertThatThrownBy(() -> joinRequestService.request("p1", "u1", null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already a member");
    }

    @Test
    void request_shouldThrow_WhenDuplicatePendingRequestExists() {
        project.setVisibility(Project.ProjectVisibility.PRIVATE);
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(memberRepository.existsByProjectIdAndUserId("p1", "u1")).thenReturn(false);
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(joinRequestRepository.existsByProjectIdAndUserId("p1", "u1")).thenReturn(true);

        assertThatThrownBy(() -> joinRequestService.request("p1", "u1", null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already requested");
        verify(joinRequestRepository, never()).save(any());
        verify(memberRepository, never()).save(any());
    }

    @Test
    void request_shouldThrow_WhenProjectArchived() {
        project.setStatus(Project.ProjectStatus.ARCHIVED);
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> joinRequestService.request("p1", "u1", null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("archived");
        verify(joinRequestRepository, never()).save(any());
    }

    @Test
    void approve_shouldThrow_WhenRequestAlreadyProcessed() {
        JoinRequest joinRequest = JoinRequest.builder()
                .projectId("p1").userId("u1").status(JoinRequestStatus.APPROVED).build();
        joinRequest.setId("jr-1");
        when(joinRequestRepository.findById("jr-1")).thenReturn(Optional.of(joinRequest));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> joinRequestService.approve("jr-1", "owner-1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("no longer pending");
        verify(memberRepository, never()).save(any());
    }

    @Test
    void approve_shouldAddMember_AndNotify() {
        project.setVisibility(Project.ProjectVisibility.PRIVATE);
        JoinRequest joinRequest = JoinRequest.builder()
                .projectId("p1").userId("u1").status(JoinRequestStatus.PENDING).build();
        joinRequest.setId("jr-1");
        when(joinRequestRepository.findById("jr-1")).thenReturn(Optional.of(joinRequest));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(memberRepository.existsByProjectIdAndUserId("p1", "u1")).thenReturn(false);
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));

        joinRequestService.approve("jr-1", "owner-1");

        verify(memberRepository).save(any(ProjectMember.class));
        assertThat(joinRequest.getStatus()).isEqualTo(JoinRequestStatus.APPROVED);
        verify(notificationService).createNotification(eq("u1"), eq("JOIN_REQUEST_APPROVED"),
                eq("Join request approved"), anyString(), eq("owner-1"), any(), any(),
                eq("p1"), eq("project"), anyString());
    }

    @Test
    void reject_shouldMarkRejected_AndNotify() {
        JoinRequest joinRequest = JoinRequest.builder()
                .projectId("p1").userId("u1").status(JoinRequestStatus.PENDING).build();
        joinRequest.setId("jr-1");
        when(joinRequestRepository.findById("jr-1")).thenReturn(Optional.of(joinRequest));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));

        joinRequestService.reject("jr-1", "owner-1");

        assertThat(joinRequest.getStatus()).isEqualTo(JoinRequestStatus.REJECTED);
        verify(memberRepository, never()).save(any());
        verify(notificationService).createNotification(eq("u1"), eq("JOIN_REQUEST_REJECTED"),
                eq("Join request declined"), anyString(), eq("owner-1"), any(), any(),
                eq("p1"), eq("project"), anyString());
    }

    @Test
    void approve_shouldThrow_WhenNonManager() {
        JoinRequest joinRequest = JoinRequest.builder()
                .projectId("p1").userId("u1").status(JoinRequestStatus.PENDING).build();
        joinRequest.setId("jr-1");
        when(joinRequestRepository.findById("jr-1")).thenReturn(Optional.of(joinRequest));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        ProjectMember member = ProjectMember.builder().projectId("p1").userId("member-1")
                .role(ProjectMember.Role.MEMBER).build();
        when(memberRepository.findByProjectIdAndUserId("p1", "member-1")).thenReturn(Optional.of(member));

        assertThatThrownBy(() -> joinRequestService.approve("jr-1", "member-1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("owner or an admin");
    }
}
