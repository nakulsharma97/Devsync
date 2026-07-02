package com.devsync.service;

import com.devsync.dto.ProjectRequest;
import com.devsync.entity.Project;
import com.devsync.entity.User;
import com.devsync.enums.ProjectStatus;
import com.devsync.exception.BadRequestException;
import com.devsync.exception.ResourceNotFoundException;
import com.devsync.repository.ProjectRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProjectServiceTest {

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private UserService userService;

    @InjectMocks
    private ProjectService projectService;

    private User testUser;
    private Project testProject;
    private ProjectRequest validRequest;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .email("user@example.com")
                .fullName("Test User")
                .username("testuser")
                .build();

        validRequest = new ProjectRequest();
        validRequest.setTitle("My Project");
        validRequest.setDescription("A test project");
        validRequest.setTechStack("Java, Spring");
        validRequest.setGithubRepo("https://github.com/user/project");
        validRequest.setLiveDemo("https://demo.example.com");
        validRequest.setTags(new HashSet<>(List.of("java", "spring")));

        testProject = Project.builder()
                .id(1L)
                .user(testUser)
                .title("My Project")
                .description("A test project")
                .techStack("Java, Spring")
                .githubRepo("https://github.com/user/project")
                .liveDemo("https://demo.example.com")
                .tags(new HashSet<>(List.of("java", "spring")))
                .status(ProjectStatus.ACTIVE)
                .build();

        when(userService.getUserById(1L)).thenReturn(testUser);
    }

    @Test
    void createProject_ShouldSucceed() {
        when(projectRepository.save(any(Project.class))).thenReturn(testProject);

        Project result = projectService.createProject(1L, validRequest);

        assertNotNull(result);
        assertEquals("My Project", result.getTitle());
        assertEquals(testUser.getId(), result.getUser().getId());

        ArgumentCaptor<Project> captor = ArgumentCaptor.forClass(Project.class);
        verify(projectRepository).save(captor.capture());
        Project saved = captor.getValue();
        assertEquals("My Project", saved.getTitle());
        assertEquals(testUser, saved.getUser());
    }

    @Test
    void createProject_ShouldThrow_WhenUserNotFound() {
        when(userService.getUserById(99L)).thenThrow(new ResourceNotFoundException("User not found with id: 99"));

        assertThrows(ResourceNotFoundException.class,
                () -> projectService.createProject(99L, validRequest));
        verify(projectRepository, never()).save(any());
    }

    @Test
    void getProjectById_ShouldReturnProject() {
        when(projectRepository.findById(1L)).thenReturn(Optional.of(testProject));

        Project result = projectService.getProjectById(1L);
        assertNotNull(result);
        assertEquals("My Project", result.getTitle());
    }

    @Test
    void getProjectById_ShouldThrow_WhenNotFound() {
        when(projectRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> projectService.getProjectById(99L));
    }

    @Test
    void getUserProjects_ShouldReturnList() {
        when(projectRepository.findByUserIdOrderByCreatedAtDesc(1L))
                .thenReturn(List.of(testProject));

        List<Project> projects = projectService.getUserProjects(1L);
        assertEquals(1, projects.size());
        assertEquals("My Project", projects.get(0).getTitle());
    }

    @Test
    void getUserProjects_ShouldReturnEmpty_WhenNoProjects() {
        when(projectRepository.findByUserIdOrderByCreatedAtDesc(1L))
                .thenReturn(List.of());

        List<Project> projects = projectService.getUserProjects(1L);
        assertTrue(projects.isEmpty());
    }

    @Test
    void updateProject_ShouldSucceed_WhenOwner() {
        when(projectRepository.findById(1L)).thenReturn(Optional.of(testProject));
        when(projectRepository.save(any(Project.class))).thenReturn(testProject);

        ProjectRequest updateRequest = new ProjectRequest();
        updateRequest.setTitle("Updated Title");
        updateRequest.setDescription("Updated description");

        Project result = projectService.updateProject(1L, 1L, updateRequest);

        assertNotNull(result);
        assertEquals("Updated Title", result.getTitle());
        assertEquals("Updated description", result.getDescription());
    // Fields not in request should be preserved
    assertEquals("Java, Spring", result.getTechStack());
    }

    @Test
    void updateProject_ShouldThrow_WhenNotOwner() {
        User otherUser = User.builder().id(2L).build();
        Project otherProject = Project.builder().id(1L).user(otherUser).build();

        when(projectRepository.findById(1L)).thenReturn(Optional.of(otherProject));

        assertThrows(BadRequestException.class,
                () -> projectService.updateProject(1L, 1L, validRequest));
        verify(projectRepository, never()).save(any());
    }

    @Test
    void deleteProject_ShouldSucceed_WhenOwner() {
        when(projectRepository.findById(1L)).thenReturn(Optional.of(testProject));

        projectService.deleteProject(1L, 1L);

        verify(projectRepository).delete(testProject);
    }

    @Test
    void deleteProject_ShouldThrow_WhenNotOwner() {
        User otherUser = User.builder().id(2L).build();
        Project otherProject = Project.builder().id(1L).user(otherUser).build();

        when(projectRepository.findById(1L)).thenReturn(Optional.of(otherProject));

        assertThrows(BadRequestException.class,
                () -> projectService.deleteProject(1L, 1L));
        verify(projectRepository, never()).delete(any());
    }

    @Test
    void searchProjects_ShouldReturnMatchingResults() {
        when(projectRepository.search("java")).thenReturn(List.of(testProject));

        List<Project> results = projectService.searchProjects("java");
        assertEquals(1, results.size());
    }

    @Test
    void getUserProjectCount_ShouldReturnCount() {
        when(projectRepository.countByUserId(1L)).thenReturn(5L);

        long count = projectService.getUserProjectCount(1L);
        assertEquals(5L, count);
    }
}
