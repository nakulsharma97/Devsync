package com.devsync.project;

import com.devsync.activity.ActivityService;
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

    private ProjectService projectService;
    private Project project;
    private UpdateProjectRequest updateRequest;

    @BeforeEach
    void setUp() {
        projectService = new ProjectService(projectRepository, memberRepository, userRepository,
                activityService, notificationService, presenceService);

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
                .isInstanceOf(IllegalArgumentException.class)
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
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("No permission to update");

        verify(projectRepository, never()).save(any());
    }

    @Test
    void updateProject_shouldThrow_WhenNonMember() {
        when(projectRepository.findById("project-1")).thenReturn(Optional.of(project));
        when(memberRepository.findByProjectIdAndUserId("project-1", "stranger"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectService.updateProject("project-1", updateRequest, "stranger"))
                .isInstanceOf(IllegalArgumentException.class)
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

        projectService.removeMember("project-1", "member-1", "owner-1");

        verify(memberRepository).delete(member);
        verify(notificationService).createNotification(eq("member-1"), eq("MEMBER_REMOVED"),
                eq("Removed from project"), contains("removed from Test Project"), eq("owner-1"),
                eq("Owner"), any(), eq("project-1"), eq("project"), anyString());
    }

    @Test
    void removeMember_shouldThrow_WhenNonOwner() {
        when(projectRepository.findById("project-1")).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> projectService.removeMember("project-1", "member-1", "admin-1"))
                .isInstanceOf(IllegalArgumentException.class)
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
                .isInstanceOf(IllegalArgumentException.class)
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
                .isInstanceOf(IllegalArgumentException.class)
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
}
