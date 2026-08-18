package com.devsync.project;

import com.devsync.activity.ActivityService;
import com.devsync.billing.EntitlementService;
import com.devsync.collab.JoinRequestService;
import com.devsync.collab.dto.JoinRequestCreateRequest;
import com.devsync.collab.entity.InvitationStatus;
import com.devsync.collab.entity.JoinRequestStatus;
import com.devsync.collab.entity.ProjectInvitation;
import com.devsync.collab.entity.JoinRequest;
import com.devsync.collab.repository.JoinRequestRepository;
import com.devsync.collab.repository.ProjectInvitationRepository;
import com.devsync.common.ForbiddenException;
import com.devsync.teamroom.TeamRoomService;
import com.devsync.kanban.entity.Board;
import com.devsync.kanban.entity.Task;
import com.devsync.kanban.repository.BoardRepository;
import com.devsync.kanban.repository.TaskRepository;
import com.devsync.notification.NotificationService;
import com.devsync.presence.PresenceService;
import com.devsync.project.dto.CreateProjectRequest;
import com.devsync.project.dto.UpdateProjectRequest;
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
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProjectServiceAuthTest {

    @Mock private ProjectRepository projectRepository;
    @Mock private ProjectMemberRepository memberRepository;
    @Mock private UserRepository userRepository;
    @Mock private ActivityService activityService;
    @Mock private NotificationService notificationService;
    @Mock private PresenceService presenceService;
    @Mock private EntitlementService entitlementService;
    @Mock private ProjectTemplateService templateService;
    @Mock private JoinRequestRepository joinRequestRepository;
    @Mock private JoinRequestService joinRequestService;
    @Mock private TeamRoomService teamRoomService;
    @Mock private ProjectInvitationRepository invitationRepository;
    @Mock private BoardRepository boardRepository;
    @Mock private TaskRepository taskRepository;

    private ProjectService projectService;
    private Project project;
    private UpdateProjectRequest updateRequest;

    @BeforeEach
    void setUp() {
        projectService = new ProjectService(projectRepository, memberRepository, userRepository,
                activityService, notificationService, presenceService, entitlementService,
                templateService, joinRequestRepository, joinRequestService, teamRoomService,
                invitationRepository, boardRepository, taskRepository);

        project = Project.builder()
                .name("Test Project")
                .description("Original description")
                .ownerId("owner-1")
                .status(Project.ProjectStatus.ACTIVE)
                .build();
        project.setId("project-1");

        updateRequest = new UpdateProjectRequest();
        updateRequest.setName("Updated Project");
        updateRequest.setDescription("Updated description");
    }

    private java.util.function.Function<Project, Project> idAssigningSave(String id) {
        return p -> {
            p.setId(id);
            return p;
        };
    }

    private void stubOwnerMembership() {
        when(memberRepository.findByProjectId(anyString())).thenReturn(java.util.List.of(
                ProjectMember.builder().projectId("project-x").userId("owner-1")
                        .role(ProjectMember.Role.OWNER).build()));
        when(userRepository.findAllById(any())).thenReturn(java.util.List.of());
    }

    @Test
    void joinPublicProject_shouldRouteThroughJoinRequestApproval() {
        // PUBLIC projects must not auto-join: joining goes through the
        // join-request flow and only becomes a membership after owner approval.
        project.setVisibility(Project.ProjectVisibility.PUBLIC);

        projectService.joinPublicProject("project-1", "member-1");

        verify(joinRequestService).request(eq("project-1"), eq("member-1"), isNull());
        verify(memberRepository, never()).save(any());
    }

    @Test
    void createProject_shouldDefaultToPrivateVisibility() {
        CreateProjectRequest request = new CreateProjectRequest();
        request.setName("New Project");
        request.setDescription("desc");

        when(projectRepository.save(any(Project.class))).thenAnswer(inv -> idAssigningSave("project-x").apply(inv.getArgument(0)));
        when(memberRepository.save(any(ProjectMember.class))).thenAnswer(inv -> inv.getArgument(0));
        stubOwnerMembership();

        var response = projectService.createProject(request, "owner-1");

        assertThat(response.getVisibility()).isEqualTo("PRIVATE");
        assertThat(response.getCurrentUserRole()).isEqualTo("OWNER");
        assertThat(response.getMemberCount()).isEqualTo(1);
    }

    @Test
    void createProject_shouldAutoCreateTeamChatForOwner() {
        CreateProjectRequest request = new CreateProjectRequest();
        request.setName("New Project");
        request.setVisibility("PUBLIC");

        when(projectRepository.save(any(Project.class))).thenAnswer(inv -> idAssigningSave("project-x").apply(inv.getArgument(0)));
        when(memberRepository.save(any(ProjectMember.class))).thenAnswer(inv -> inv.getArgument(0));
        stubOwnerMembership();

        projectService.createProject(request, "owner-1");

        // The project's team chat is created in the same transaction and the
        // owner joins it automatically.
        verify(teamRoomService).addProjectMemberToRoom("project-x", "owner-1");
    }

    @Test
    void createProject_shouldHonourExplicitVisibility() {
        CreateProjectRequest request = new CreateProjectRequest();
        request.setName("Public Project");
        request.setVisibility("public"); // case-insensitive

        when(projectRepository.save(any(Project.class))).thenAnswer(inv -> idAssigningSave("project-x").apply(inv.getArgument(0)));
        when(memberRepository.save(any(ProjectMember.class))).thenAnswer(inv -> inv.getArgument(0));
        stubOwnerMembership();

        var response = projectService.createProject(request, "owner-1");

        assertThat(response.getVisibility()).isEqualTo("PUBLIC");
    }

    @Test
    void createProject_shouldRejectInvalidVisibility() {
        CreateProjectRequest request = new CreateProjectRequest();
        request.setName("Bad Project");
        request.setVisibility("SECRET");

        assertThatThrownBy(() -> projectService.createProject(request, "owner-1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid visibility");
        verify(projectRepository, never()).save(any());
    }

    @Test
    void updateProject_shouldSucceed_WhenOwner() {
        when(projectRepository.findById("project-1")).thenReturn(Optional.of(project));
        when(projectRepository.save(any(Project.class))).thenReturn(project);

        var response = projectService.updateProject("project-1", updateRequest, "owner-1");

        assertThat(response.getName()).isEqualTo("Updated Project");
        assertThat(response.getDescription()).isEqualTo("Updated description");
        verify(projectRepository).save(any(Project.class));
    }

    @Test
    void updateProject_shouldSucceed_WhenAdminMember() {
        when(projectRepository.findById("project-1")).thenReturn(Optional.of(project));
        ProjectMember adminMember = ProjectMember.builder()
                .projectId("project-1").userId("admin-1")
                .role(ProjectMember.Role.ADMIN).build();
        when(memberRepository.findByProjectIdAndUserId("project-1", "admin-1"))
                .thenReturn(Optional.of(adminMember));
        when(projectRepository.save(any(Project.class))).thenReturn(project);

        var response = projectService.updateProject("project-1", updateRequest, "admin-1");

        assertThat(response.getName()).isEqualTo("Updated Project");
        verify(projectRepository).save(any(Project.class));
    }

    @Test
    void updateProject_shouldThrow_WhenRegularMember() {
        when(projectRepository.findById("project-1")).thenReturn(Optional.of(project));
        ProjectMember regularMember = ProjectMember.builder()
                .projectId("project-1").userId("member-1")
                .role(ProjectMember.Role.MEMBER).build();
        when(memberRepository.findByProjectIdAndUserId("project-1", "member-1"))
                .thenReturn(Optional.of(regularMember));

        assertThatThrownBy(() -> projectService.updateProject("project-1", updateRequest, "member-1"))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("No permission to update");

        verify(projectRepository, never()).save(any());
    }

    @Test
    void updateProject_shouldThrow_WhenViewer() {
        when(projectRepository.findById("project-1")).thenReturn(Optional.of(project));
        ProjectMember viewer = ProjectMember.builder()
                .projectId("project-1").userId("viewer-1")
                .role(ProjectMember.Role.VIEWER).build();
        when(memberRepository.findByProjectIdAndUserId("project-1", "viewer-1"))
                .thenReturn(Optional.of(viewer));

        assertThatThrownBy(() -> projectService.updateProject("project-1", updateRequest, "viewer-1"))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("No permission to update");

        verify(projectRepository, never()).save(any());
    }

    @Test
    void updateProject_shouldThrow_WhenNonMember() {
        when(projectRepository.findById("project-1")).thenReturn(Optional.of(project));
        when(memberRepository.findByProjectIdAndUserId("project-1", "stranger"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectService.updateProject("project-1", updateRequest, "stranger"))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("No permission to update");

        verify(projectRepository, never()).save(any());
    }

    @Test
    void removeMember_shouldNotifyRemovedUser() {
        when(projectRepository.findById("project-1")).thenReturn(Optional.of(project));
        ProjectMember member = ProjectMember.builder()
                .projectId("project-1").userId("member-1")
                .role(ProjectMember.Role.MEMBER).build();
        when(memberRepository.findByProjectIdAndUserId("project-1", "member-1"))
                .thenReturn(Optional.of(member));
        User actor = User.builder().email("owner@dev.com").fullName("Owner").build();
        actor.setId("owner-1");
        when(userRepository.findById("owner-1")).thenReturn(Optional.of(actor));
        User removed = User.builder().email("member@dev.com").fullName("Member One").build();
        removed.setId("member-1");
        when(userRepository.findById("member-1")).thenReturn(Optional.of(removed));
        when(joinRequestRepository.findByProjectIdAndUserId("project-1", "member-1"))
                .thenReturn(Optional.empty());
        when(invitationRepository.findFirstByProjectIdAndReceiverIdAndStatus(
                "project-1", "member-1", InvitationStatus.PENDING)).thenReturn(Optional.empty());
        when(boardRepository.findByProjectId("project-1")).thenReturn(java.util.List.of());

        projectService.removeMember("project-1", "member-1", "owner-1");

        verify(memberRepository).delete(member);
        verify(teamRoomService).removeProjectMemberFromRoom("project-1", "member-1");
        verify(notificationService).createNotification(eq("member-1"), eq("MEMBER_REMOVED"),
                eq("Removed from project"), contains("removed from Test Project"), eq("owner-1"),
                eq("Owner"), any(), eq("project-1"), eq("project"), anyString());
    }

    @Test
    void removeMember_shouldUnassignTasks_andCancelPendingRequests() {
        when(projectRepository.findById("project-1")).thenReturn(Optional.of(project));
        ProjectMember member = ProjectMember.builder()
                .projectId("project-1").userId("member-1")
                .role(ProjectMember.Role.MEMBER).build();
        when(memberRepository.findByProjectIdAndUserId("project-1", "member-1"))
                .thenReturn(Optional.of(member));
        when(userRepository.findById("member-1")).thenReturn(Optional.empty());
        when(userRepository.findById("owner-1")).thenReturn(Optional.empty());

        // Pending join request + pending invitation are cancelled/expired.
        JoinRequest pendingRequest = JoinRequest.builder()
                .projectId("project-1").userId("member-1")
                .status(JoinRequestStatus.PENDING).build();
        pendingRequest.setId("jr-1");
        when(joinRequestRepository.findByProjectIdAndUserId("project-1", "member-1"))
                .thenReturn(Optional.of(pendingRequest));
        ProjectInvitation pendingInvite = ProjectInvitation.builder()
                .projectId("project-1").senderId("owner-1").receiverId("member-1").build();
        pendingInvite.setId("inv-1");
        when(invitationRepository.findFirstByProjectIdAndReceiverIdAndStatus(
                "project-1", "member-1", InvitationStatus.PENDING))
                .thenReturn(Optional.of(pendingInvite));

        // The member has tasks assigned across the project's boards.
        Board board = Board.builder().name("Board").projectId("project-1").createdBy("owner-1").build();
        board.setId("board-1");
        when(boardRepository.findByProjectId("project-1")).thenReturn(java.util.List.of(board));
        Task assigned = Task.builder().title("Login API").boardId("board-1").assigneeId("member-1").build();
        assigned.setId("task-1");
        Task other = Task.builder().title("Other").boardId("board-1").assigneeId("owner-1").build();
        other.setId("task-2");
        when(taskRepository.findByBoardIdIn(any())).thenReturn(java.util.List.of(assigned, other));
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

        projectService.removeMember("project-1", "member-1", "owner-1");

        // Only the removed user's tasks are unassigned; the task itself is kept.
        assertThat(assigned.getAssigneeId()).isNull();
        assertThat(other.getAssigneeId()).isEqualTo("owner-1");
        verify(taskRepository).save(assigned);
        // Pending request cancelled + invitation invalidated so a stale approval
        // cannot restore access.
        assertThat(pendingRequest.getStatus()).isEqualTo(JoinRequestStatus.CANCELLED);
        assertThat(pendingInvite.getStatus()).isEqualTo(InvitationStatus.EXPIRED);
        verify(joinRequestRepository).save(pendingRequest);
        verify(invitationRepository).save(pendingInvite);
    }

    @Test
    void removeMember_shouldThrow_WhenRemovingTheOwner() {
        when(projectRepository.findById("project-1")).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> projectService.removeMember("project-1", "owner-1", "owner-1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Cannot remove the project owner");
        verify(memberRepository, never()).delete(any());
        verify(teamRoomService, never()).removeProjectMemberFromRoom(anyString(), anyString());
    }

    @Test
    void removeMember_shouldThrow_WhenNonOwner() {
        when(projectRepository.findById("project-1")).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> projectService.removeMember("project-1", "member-1", "admin-1"))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Only the project owner");
        verify(memberRepository, never()).delete(any());
        verify(notificationService, never()).createNotification(any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void updateMemberRole_shouldNotifyMember_WhenRoleChanges() {
        when(projectRepository.findById("project-1")).thenReturn(Optional.of(project));
        ProjectMember member = ProjectMember.builder()
                .projectId("project-1").userId("member-1")
                .role(ProjectMember.Role.MEMBER).build();
        when(memberRepository.findByProjectIdAndUserId("project-1", "member-1"))
                .thenReturn(Optional.of(member));
        when(memberRepository.save(any(ProjectMember.class))).thenReturn(member);
        User memberUser = User.builder().email("member@dev.com").fullName("Member One").build();
        memberUser.setId("member-1");
        when(userRepository.findById("member-1")).thenReturn(Optional.of(memberUser));

        projectService.updateMemberRole("project-1", "member-1", "ADMIN", "owner-1");

        assertThat(member.getRole()).isEqualTo(ProjectMember.Role.ADMIN);
        verify(notificationService).createNotification(eq("member-1"), eq("MEMBER_ROLE_CHANGED"),
                eq("Role changed"), contains("is now ADMIN"), eq("owner-1"), any(), any(),
                eq("project-1"), eq("project"), anyString());
        verify(activityService).record(eq("owner-1"), eq("project-1"),
                eq(com.devsync.activity.entity.ActivityType.MEMBER_ROLE_CHANGED), anyString(), anyString(), any());
    }

    @Test
    void updateMemberRole_shouldThrow_WhenNonOwner() {
        when(projectRepository.findById("project-1")).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> projectService.updateMemberRole("project-1", "member-1", "ADMIN", "admin-1"))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Only the project owner");
        verify(notificationService, never()).createNotification(any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void updateProject_shouldThrow_WhenProjectNotFound() {
        when(projectRepository.findById("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectService.updateProject("ghost", updateRequest, "user-1"))
                .isInstanceOf(com.devsync.common.ResourceNotFoundException.class);
    }

    @Test
    void deleteProject_shouldSoftDelete_WhenOwner() {
        when(projectRepository.findById("project-1")).thenReturn(Optional.of(project));
        when(projectRepository.save(any(Project.class))).thenAnswer(inv -> inv.getArgument(0));

        projectService.deleteProject("project-1", "owner-1");

        assertThat(project.isDeleted()).isTrue();
        assertThat(project.getDeletedAt()).isNotNull();
        // Related records (members, boards, tasks, rooms, ...) must NOT be deleted
        verify(memberRepository, never()).delete(any());
        verify(projectRepository, never()).delete(any());
        verify(projectRepository, never()).deleteById(anyString());
        verify(activityService).record(eq("owner-1"), eq("project-1"),
                eq(com.devsync.activity.entity.ActivityType.PROJECT_DELETED), anyString(), anyString(), any());
    }

    @Test
    void deleteProject_shouldThrow_WhenNonOwner() {
        when(projectRepository.findById("project-1")).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> projectService.deleteProject("project-1", "member-1"))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Only the project owner");
        verify(projectRepository, never()).save(any());
        verify(activityService, never()).record(any(), any(), any(), any(), any(), any());
    }

    @Test
    void deleteProject_shouldThrow_WhenProjectAlreadyDeleted() {
        project.setDeleted(true);
        project.setDeletedAt(java.time.Instant.now());
        when(projectRepository.findById("project-1")).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> projectService.deleteProject("project-1", "owner-1"))
                .isInstanceOf(com.devsync.common.ResourceNotFoundException.class);
        verify(projectRepository, never()).save(any());
    }

    @Test
    void getProject_shouldThrow_WhenProjectDeleted() {
        project.setDeleted(true);
        project.setDeletedAt(java.time.Instant.now());
        when(projectRepository.findById("project-1")).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> projectService.getProject("project-1", "owner-1"))
                .isInstanceOf(com.devsync.common.ResourceNotFoundException.class);
    }

    @Test
    void getProject_shouldRemainReadable_WhenArchived() {
        project.setStatus(Project.ProjectStatus.ARCHIVED);
        when(projectRepository.findById("project-1")).thenReturn(Optional.of(project));
        when(memberRepository.findByProjectId("project-1")).thenReturn(java.util.List.of(
                ProjectMember.builder().projectId("project-1").userId("member-1")
                        .role(ProjectMember.Role.MEMBER).build()));
        when(memberRepository.existsByProjectIdAndUserId("project-1", "member-1")).thenReturn(true);
        when(userRepository.findAllById(any())).thenReturn(java.util.List.of());

        var response = projectService.getProject("project-1", "member-1");

        assertThat(response.getStatus()).isEqualTo("ARCHIVED");
        assertThat(response.getCurrentUserRole()).isEqualTo("MEMBER");
    }

    // ── Ownership transfer ───────────────────────────────────

    @Test
    void transferOwnership_shouldSwapRoles_updateOwner_andNotifyBoth() {
        when(projectRepository.findByIdForUpdate("project-1")).thenReturn(Optional.of(project));

        ProjectMember ownerMember = ProjectMember.builder()
                .projectId("project-1").userId("owner-1")
                .role(ProjectMember.Role.OWNER).build();
        ProjectMember targetMember = ProjectMember.builder()
                .projectId("project-1").userId("member-1")
                .role(ProjectMember.Role.MEMBER).build();
        when(memberRepository.findByProjectIdAndUserId("project-1", "member-1"))
                .thenReturn(Optional.of(targetMember));
        when(memberRepository.findByProjectIdAndUserId("project-1", "owner-1"))
                .thenReturn(Optional.of(ownerMember));
        when(memberRepository.save(any(ProjectMember.class))).thenAnswer(inv -> inv.getArgument(0));
        when(projectRepository.save(any(Project.class))).thenAnswer(inv -> inv.getArgument(0));

        User targetUser = User.builder().email("member@dev.com").fullName("Member One").build();
        targetUser.setId("member-1");
        User actor = User.builder().email("owner@dev.com").fullName("Owner").build();
        actor.setId("owner-1");
        when(userRepository.findById("member-1")).thenReturn(Optional.of(targetUser));
        when(userRepository.findById("owner-1")).thenReturn(Optional.of(actor));

        // Response building: members list + no extra users + no join request.
        when(memberRepository.findByProjectId("project-1"))
                .thenReturn(java.util.List.of(ownerMember, targetMember));
        when(userRepository.findAllById(any())).thenReturn(java.util.List.of());
        when(joinRequestRepository.findByProjectIdAndUserId("project-1", "owner-1"))
                .thenReturn(Optional.empty());

        var response = projectService.transferOwnership("project-1", "member-1", "owner-1");

        // Roles swapped, project owner updated, membership preserved.
        assertThat(project.getOwnerId()).isEqualTo("member-1");
        assertThat(targetMember.getRole()).isEqualTo(ProjectMember.Role.OWNER);
        assertThat(ownerMember.getRole()).isEqualTo(ProjectMember.Role.MEMBER);
        assertThat(response.getOwnerId()).isEqualTo("member-1");
        assertThat(response.getCurrentUserRole()).isEqualTo("MEMBER");

        // Exactly one OWNER exists after the transfer.
        long ownerCount = java.util.List.of(ownerMember, targetMember).stream()
                .filter(m -> m.getRole() == ProjectMember.Role.OWNER).count();
        assertThat(ownerCount).isEqualTo(1);

        // Notifications to both parties with real names, activity records.
        verify(notificationService).createNotification(eq("member-1"), eq("OWNERSHIP_TRANSFERRED"),
                eq("You are now the owner"), contains("now the owner of Test Project"),
                eq("owner-1"), eq("Owner"), any(), eq("project-1"), eq("project"), anyString());
        verify(notificationService).createNotification(eq("owner-1"), eq("OWNERSHIP_TRANSFERRED"),
                eq("Ownership transferred"), contains("transferred to Member One"),
                eq("member-1"), eq("Member One"), any(), eq("project-1"), eq("project"), anyString());
        verify(activityService).record(eq("owner-1"), eq("project-1"),
                eq(com.devsync.activity.entity.ActivityType.OWNERSHIP_TRANSFERRED), anyString(),
                contains("Member One"), eq("member-1"));
        verify(activityService).record(eq("member-1"), eq("project-1"),
                eq(com.devsync.activity.entity.ActivityType.OWNERSHIP_TRANSFERRED),
                eq("Became project owner"), anyString(), isNull());

        // Team chat membership must be preserved for both — the service must
        // never touch room participants during a transfer.
        verify(teamRoomService, never()).removeProjectMemberFromRoom(anyString(), anyString());
    }

    @Test
    void transferOwnership_shouldThrow_WhenNonOwner() {
        when(projectRepository.findByIdForUpdate("project-1")).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> projectService.transferOwnership("project-1", "member-1", "admin-1"))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Only the project owner");
        verify(projectRepository, never()).save(any());
        verify(notificationService, never()).createNotification(any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void transferOwnership_shouldThrow_WhenTargetIsNotAMember() {
        when(projectRepository.findByIdForUpdate("project-1")).thenReturn(Optional.of(project));
        User stranger = User.builder().email("stranger@dev.com").fullName("Stranger").build();
        stranger.setId("stranger-1");
        when(userRepository.findById("stranger-1")).thenReturn(Optional.of(stranger));
        when(memberRepository.findByProjectIdAndUserId("project-1", "stranger-1"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectService.transferOwnership("project-1", "stranger-1", "owner-1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not a member");
        verify(projectRepository, never()).save(any());
    }

    @Test
    void transferOwnership_shouldThrow_WhenTargetIsAlreadyOwner() {
        when(projectRepository.findByIdForUpdate("project-1")).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> projectService.transferOwnership("project-1", "owner-1", "owner-1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already the project owner");
        verify(projectRepository, never()).save(any());
    }

    @Test
    void transferOwnership_shouldLockTheProjectRow() {
        when(projectRepository.findByIdForUpdate("project-1")).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> projectService.transferOwnership("project-1", "member-1", "admin-1"))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Only the project owner");

        // Concurrency guard: the ownership check runs against the locked row,
        // so two simultaneous transfers cannot both read the same owner.
        verify(projectRepository).findByIdForUpdate("project-1");
    }
}
