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
    void updateProject_shouldThrow_WhenProjectNotFound() {
        when(projectRepository.findById("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectService.updateProject("ghost", updateRequest, "user-1"))
                .isInstanceOf(com.devsync.common.ResourceNotFoundException.class);
    }
}
