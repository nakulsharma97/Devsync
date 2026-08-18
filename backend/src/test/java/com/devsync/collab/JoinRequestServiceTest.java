package com.devsync.collab;

import com.devsync.activity.ActivityService;
import com.devsync.billing.EntitlementService;
import com.devsync.collab.entity.JoinRequest;
import com.devsync.collab.entity.JoinRequestStatus;
import com.devsync.collab.repository.JoinRequestRepository;
import com.devsync.notification.NotificationService;
import com.devsync.project.entity.Project;
import com.devsync.teamroom.TeamRoomService;
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
    @Mock private EntitlementService entitlementService;
    @Mock private TeamRoomService teamRoomService;

    private JoinRequestService joinRequestService;
    private Project project;
    private User user;

    @BeforeEach
    void setUp() {
        joinRequestService = new JoinRequestService(joinRequestRepository, projectRepository,
                memberRepository, userRepository, notificationService, activityService,
                entitlementService, teamRoomService);
        project = Project.builder().name("DevSync").ownerId("owner-1")
                .visibility(Project.ProjectVisibility.PUBLIC).build();
        project.setId("p1");
        user = User.builder().email("user@dev.com").fullName("User").build();
        user.setId("u1");
    }

    @Test
    void request_shouldCreatePending_WhenPublicProject() {
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(memberRepository.existsByProjectIdAndUserId("p1", "u1")).thenReturn(false);
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(joinRequestRepository.findByProjectIdAndUserId("p1", "u1")).thenReturn(Optional.empty());
        when(joinRequestRepository.save(any(JoinRequest.class))).thenAnswer(inv -> {
            JoinRequest jr = inv.getArgument(0);
            jr.setId("jr-1");
            return jr;
        });
        when(memberRepository.findByProjectId("p1")).thenReturn(java.util.List.of(
                ProjectMember.builder().projectId("p1").userId("owner-1")
                        .role(ProjectMember.Role.OWNER).build()));

        var response = joinRequestService.request("p1", "u1", null);

        // PUBLIC projects go through owner approval too — no auto-join.
        assertThat(response.getStatus()).isEqualTo(JoinRequestStatus.PENDING.name());
        assertThat(response.getId()).isEqualTo("jr-1");
        verify(memberRepository, never()).save(any());
        verify(notificationService).createNotification(eq("owner-1"), eq("JOIN_REQUEST"),
                eq("Join request"), contains("requested to join your project"),
                eq("u1"), any(), any(), eq("p1"), eq("project"), anyString());
        verify(activityService).record(eq("u1"), eq("p1"),
                eq(com.devsync.activity.entity.ActivityType.JOIN_REQUESTED), anyString(), anyString(), any());
    }

    @Test
    void request_shouldThrow_WhenPrivateProject() {
        project.setVisibility(Project.ProjectVisibility.PRIVATE);
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));

        // PRIVATE projects cannot be joined by request — invite only.
        assertThatThrownBy(() -> joinRequestService.request("p1", "u1", null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("private");
        verify(joinRequestRepository, never()).save(any());
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
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(memberRepository.existsByProjectIdAndUserId("p1", "u1")).thenReturn(false);
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        JoinRequest pending = JoinRequest.builder()
                .projectId("p1").userId("u1").status(JoinRequestStatus.PENDING).build();
        when(joinRequestRepository.findByProjectIdAndUserId("p1", "u1")).thenReturn(Optional.of(pending));

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
        // Accepted members join the team chat atomically with membership.
        verify(teamRoomService).addProjectMemberToRoom("p1", "u1");
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
    void request_shouldThrow_WhenOwnerRequestsOwnProject() {
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> joinRequestService.request("p1", "owner-1", null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("your own project");
        verify(joinRequestRepository, never()).save(any());
        verify(memberRepository, never()).save(any());
    }

    @Test
    void request_shouldReactivate_WhenPreviouslyRejected() {
        JoinRequest rejected = JoinRequest.builder()
                .projectId("p1").userId("u1").status(JoinRequestStatus.REJECTED).build();
        rejected.setId("jr-1");
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(memberRepository.existsByProjectIdAndUserId("p1", "u1")).thenReturn(false);
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(joinRequestRepository.findByProjectIdAndUserId("p1", "u1")).thenReturn(Optional.of(rejected));
        when(joinRequestRepository.save(any(JoinRequest.class))).thenAnswer(inv -> inv.getArgument(0));
        when(memberRepository.findByProjectId("p1")).thenReturn(java.util.List.of());

        var response = joinRequestService.request("p1", "u1", null);

        assertThat(response.getStatus()).isEqualTo(JoinRequestStatus.PENDING.name());
        assertThat(rejected.getStatus()).isEqualTo(JoinRequestStatus.PENDING);
        verify(joinRequestRepository).save(rejected);
        verify(memberRepository, never()).save(any());
    }

    @Test
    void request_shouldReactivate_WhenApprovedButMemberWasRemoved() {
        // Approved earlier, then the user was removed from the project — the
        // unique (project, user) row is reactivated instead of duplicated.
        JoinRequest approved = JoinRequest.builder()
                .projectId("p1").userId("u1").status(JoinRequestStatus.APPROVED).build();
        approved.setId("jr-1");
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(memberRepository.existsByProjectIdAndUserId("p1", "u1")).thenReturn(false);
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(joinRequestRepository.findByProjectIdAndUserId("p1", "u1")).thenReturn(Optional.of(approved));
        when(joinRequestRepository.save(any(JoinRequest.class))).thenAnswer(inv -> inv.getArgument(0));
        when(memberRepository.findByProjectId("p1")).thenReturn(java.util.List.of());

        var response = joinRequestService.request("p1", "u1", null);

        assertThat(response.getStatus()).isEqualTo(JoinRequestStatus.PENDING.name());
        assertThat(approved.getStatus()).isEqualTo(JoinRequestStatus.PENDING);
        verify(joinRequestRepository).save(approved);
        verify(memberRepository, never()).save(any());
    }

    @Test
    void cancel_shouldMarkCancelled_WhenRequester() {
        JoinRequest joinRequest = JoinRequest.builder()
                .projectId("p1").userId("u1").status(JoinRequestStatus.PENDING).build();
        joinRequest.setId("jr-1");
        when(joinRequestRepository.findById("jr-1")).thenReturn(Optional.of(joinRequest));
        when(joinRequestRepository.save(any(JoinRequest.class))).thenReturn(joinRequest);

        joinRequestService.cancel("jr-1", "u1");

        assertThat(joinRequest.getStatus()).isEqualTo(JoinRequestStatus.CANCELLED);
        verify(joinRequestRepository).save(joinRequest);
        verify(memberRepository, never()).save(any());
    }

    @Test
    void cancel_shouldAllow_WhenManager() {
        JoinRequest joinRequest = JoinRequest.builder()
                .projectId("p1").userId("u1").status(JoinRequestStatus.PENDING).build();
        joinRequest.setId("jr-1");
        when(joinRequestRepository.findById("jr-1")).thenReturn(Optional.of(joinRequest));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(joinRequestRepository.save(any(JoinRequest.class))).thenReturn(joinRequest);

        joinRequestService.cancel("jr-1", "owner-1");

        assertThat(joinRequest.getStatus()).isEqualTo(JoinRequestStatus.CANCELLED);
    }

    @Test
    void cancel_shouldThrow_WhenNotRequesterOrManager() {
        JoinRequest joinRequest = JoinRequest.builder()
                .projectId("p1").userId("u1").status(JoinRequestStatus.PENDING).build();
        joinRequest.setId("jr-1");
        when(joinRequestRepository.findById("jr-1")).thenReturn(Optional.of(joinRequest));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        ProjectMember member = ProjectMember.builder().projectId("p1").userId("member-1")
                .role(ProjectMember.Role.MEMBER).build();
        when(memberRepository.findByProjectIdAndUserId("p1", "member-1")).thenReturn(Optional.of(member));

        assertThatThrownBy(() -> joinRequestService.cancel("jr-1", "member-1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("requester or a project manager");
        verify(joinRequestRepository, never()).save(any());
    }

    @Test
    void cancel_shouldThrow_WhenAlreadyProcessed() {
        JoinRequest joinRequest = JoinRequest.builder()
                .projectId("p1").userId("u1").status(JoinRequestStatus.APPROVED).build();
        joinRequest.setId("jr-1");
        when(joinRequestRepository.findById("jr-1")).thenReturn(Optional.of(joinRequest));

        assertThatThrownBy(() -> joinRequestService.cancel("jr-1", "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("no longer pending");
        verify(joinRequestRepository, never()).save(any());
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
        verify(memberRepository, never()).save(any());
    }

    @Test
    void reject_shouldThrow_WhenNonManager() {
        JoinRequest joinRequest = JoinRequest.builder()
                .projectId("p1").userId("u1").status(JoinRequestStatus.PENDING).build();
        joinRequest.setId("jr-1");
        when(joinRequestRepository.findById("jr-1")).thenReturn(Optional.of(joinRequest));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        ProjectMember member = ProjectMember.builder().projectId("p1").userId("member-1")
                .role(ProjectMember.Role.MEMBER).build();
        when(memberRepository.findByProjectIdAndUserId("p1", "member-1")).thenReturn(Optional.of(member));

        assertThatThrownBy(() -> joinRequestService.reject("jr-1", "member-1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("owner or an admin");
        verify(joinRequestRepository, never()).save(any());
    }

    @Test
    void approve_shouldNotDuplicateMembership_WhenAlreadyMember() {
        JoinRequest joinRequest = JoinRequest.builder()
                .projectId("p1").userId("u1").status(JoinRequestStatus.PENDING).build();
        joinRequest.setId("jr-1");
        when(joinRequestRepository.findById("jr-1")).thenReturn(Optional.of(joinRequest));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(memberRepository.existsByProjectIdAndUserId("p1", "u1")).thenReturn(true);
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));

        joinRequestService.approve("jr-1", "owner-1");

        assertThat(joinRequest.getStatus()).isEqualTo(JoinRequestStatus.APPROVED);
        verify(memberRepository, never()).save(any());
        verify(activityService).record(eq("owner-1"), eq("p1"),
                eq(com.devsync.activity.entity.ActivityType.JOIN_APPROVED), anyString(), anyString(), any());
    }

    @Test
    void reject_shouldRecordActivity_AndNotCreateMembership() {
        JoinRequest joinRequest = JoinRequest.builder()
                .projectId("p1").userId("u1").status(JoinRequestStatus.PENDING).build();
        joinRequest.setId("jr-1");
        when(joinRequestRepository.findById("jr-1")).thenReturn(Optional.of(joinRequest));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));

        joinRequestService.reject("jr-1", "owner-1");

        assertThat(joinRequest.getStatus()).isEqualTo(JoinRequestStatus.REJECTED);
        verify(memberRepository, never()).save(any());
        verify(activityService).record(eq("owner-1"), eq("p1"),
                eq(com.devsync.activity.entity.ActivityType.JOIN_REJECTED), anyString(), anyString(), any());
    }

    @Test
    void listMine_shouldReturnOwnRequests_FilteredByProject() {
        JoinRequest mine = JoinRequest.builder()
                .projectId("p1").userId("u1").status(JoinRequestStatus.PENDING).build();
        mine.setId("jr-1");
        JoinRequest other = JoinRequest.builder()
                .projectId("p9").userId("u1").status(JoinRequestStatus.PENDING).build();
        other.setId("jr-2");
        when(joinRequestRepository.findByUserIdOrderByCreatedAtDesc("u1"))
                .thenReturn(java.util.List.of(mine, other));
        when(projectRepository.findAllById(java.util.Set.of("p1"))).thenReturn(java.util.List.of(project));
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));

        var response = joinRequestService.listMine("u1", "p1");

        assertThat(response).hasSize(1);
        assertThat(response.get(0).getId()).isEqualTo("jr-1");
    }
}
