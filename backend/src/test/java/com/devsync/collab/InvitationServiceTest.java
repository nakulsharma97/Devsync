package com.devsync.collab;

import com.devsync.activity.ActivityService;
import com.devsync.collab.dto.InviteRequest;
import com.devsync.collab.entity.InvitationStatus;
import com.devsync.collab.entity.ProjectInvitation;
import com.devsync.collab.repository.ProjectInvitationRepository;
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

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InvitationServiceTest {

    @Mock private ProjectInvitationRepository invitationRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private ProjectMemberRepository memberRepository;
    @Mock private UserRepository userRepository;
    @Mock private NotificationService notificationService;
    @Mock private ActivityService activityService;

    private InvitationService invitationService;
    private Project project;
    private User owner;
    private User receiver;

    @BeforeEach
    void setUp() {
        invitationService = new InvitationService(invitationRepository, projectRepository,
                memberRepository, userRepository, notificationService, activityService);
        project = Project.builder().name("DevSync").ownerId("owner-1")
                .visibility(Project.ProjectVisibility.PUBLIC).build();
        project.setId("p1");
        owner = User.builder().email("owner@dev.com").fullName("Owner").build();
        owner.setId("owner-1");
        receiver = User.builder().email("receiver@dev.com").fullName("Receiver").build();
        receiver.setId("recv-1");
    }

    @Test
    void invite_shouldSucceed_AndNotifyReceiver() {
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(userRepository.findByEmailOrUsername("receiver@dev.com")).thenReturn(Optional.of(receiver));
        when(userRepository.findById("owner-1")).thenReturn(Optional.of(owner));
        when(memberRepository.existsByProjectIdAndUserId("p1", "recv-1")).thenReturn(false);
        when(invitationRepository.existsByProjectIdAndReceiverIdAndStatus(any(), any(), any())).thenReturn(false);
        when(invitationRepository.save(any(ProjectInvitation.class))).thenAnswer(inv -> {
            ProjectInvitation pi = inv.getArgument(0);
            pi.setId("inv-1");
            pi.setCreatedAt(Instant.now());
            return pi;
        });

        InviteRequest request = new InviteRequest();
        request.setUsernameOrEmail("receiver@dev.com");

        var response = invitationService.invite("p1", request, "owner-1");

        assertThat(response.getReceiverId()).isEqualTo("recv-1");
        assertThat(response.getStatus()).isEqualTo("PENDING");
        assertThat(response.getExpiresAt()).isAfter(Instant.now());
        verify(notificationService).createNotification(eq("recv-1"), eq("PROJECT_INVITE"),
                eq("Project invitation"), anyString(), eq("owner-1"), eq("Owner"), any(),
                eq("p1"), eq("project"), anyString());
    }

    @Test
    void invite_shouldThrow_WhenUserNotFound() {
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(userRepository.findByEmailOrUsername("ghost@dev.com")).thenReturn(Optional.empty());

        InviteRequest request = new InviteRequest();
        request.setUsernameOrEmail("ghost@dev.com");

        assertThatThrownBy(() -> invitationService.invite("p1", request, "owner-1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("No user found");
    }

    @Test
    void invite_shouldThrow_WhenAlreadyMember() {
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(userRepository.findByEmailOrUsername("receiver@dev.com")).thenReturn(Optional.of(receiver));
        when(memberRepository.existsByProjectIdAndUserId("p1", "recv-1")).thenReturn(true);

        InviteRequest request = new InviteRequest();
        request.setUsernameOrEmail("receiver@dev.com");

        assertThatThrownBy(() -> invitationService.invite("p1", request, "owner-1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already a member");
    }

    @Test
    void invite_shouldThrow_WhenNonManager() {
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        ProjectMember member = ProjectMember.builder().projectId("p1").userId("member-1")
                .role(ProjectMember.Role.MEMBER).build();
        when(memberRepository.findByProjectIdAndUserId("p1", "member-1")).thenReturn(Optional.of(member));

        InviteRequest request = new InviteRequest();
        request.setUsernameOrEmail("receiver@dev.com");

        assertThatThrownBy(() -> invitationService.invite("p1", request, "member-1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("owner or an admin");
        verify(invitationRepository, never()).save(any());
    }

    @Test
    void accept_shouldAddMember_AndMarkAccepted() {
        ProjectInvitation invitation = ProjectInvitation.builder()
                .projectId("p1").senderId("owner-1").receiverId("recv-1")
                .status(InvitationStatus.PENDING).expiresAt(Instant.now().plusSeconds(3600)).build();
        invitation.setId("inv-1");
        when(invitationRepository.findById("inv-1")).thenReturn(Optional.of(invitation));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(memberRepository.existsByProjectIdAndUserId("p1", "recv-1")).thenReturn(false);
        when(invitationRepository.save(any(ProjectInvitation.class))).thenReturn(invitation);
        when(userRepository.findById("owner-1")).thenReturn(Optional.of(owner));
        when(userRepository.findById("recv-1")).thenReturn(Optional.of(receiver));

        invitationService.accept("inv-1", "recv-1");

        verify(memberRepository).save(any(ProjectMember.class));
        assertThat(invitation.getStatus()).isEqualTo(InvitationStatus.ACCEPTED);
    }

    @Test
    void accept_shouldThrow_WhenExpired() {
        ProjectInvitation invitation = ProjectInvitation.builder()
                .projectId("p1").senderId("owner-1").receiverId("recv-1")
                .status(InvitationStatus.PENDING).expiresAt(Instant.now().minusSeconds(60)).build();
        invitation.setId("inv-1");
        when(invitationRepository.findById("inv-1")).thenReturn(Optional.of(invitation));
        when(invitationRepository.save(any(ProjectInvitation.class))).thenReturn(invitation);

        assertThatThrownBy(() -> invitationService.accept("inv-1", "recv-1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("expired");
        assertThat(invitation.getStatus()).isEqualTo(InvitationStatus.EXPIRED);
        verify(memberRepository, never()).save(any());
    }
}
