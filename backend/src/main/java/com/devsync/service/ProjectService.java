package com.devsync.service;

import com.devsync.dto.ProjectRequest;
import com.devsync.entity.Project;
import com.devsync.entity.User;
import com.devsync.exception.BadRequestException;
import com.devsync.exception.ResourceNotFoundException;
import com.devsync.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final UserService userService;

    @Transactional
    public Project createProject(Long userId, ProjectRequest request) {
        User user = userService.getUserById(userId);

        Project project = Project.builder()
                .user(user)
                .title(request.getTitle())
                .description(request.getDescription())
                .techStack(request.getTechStack())
                .githubRepo(request.getGithubRepo())
                .liveDemo(request.getLiveDemo())
                .videoDemo(request.getVideoDemo())
                .tags(request.getTags())
                .build();

        return projectRepository.save(project);
    }

    @Transactional(readOnly = true)
    public Project getProjectById(Long projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectId));
    }

    @Transactional(readOnly = true)
    public List<Project> getUserProjects(Long userId) {
        return projectRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public List<Project> searchProjects(String query) {
        return projectRepository.search(query);
    }

    @Transactional
    public Project updateProject(Long projectId, Long userId, ProjectRequest request) {
        Project project = getProjectById(projectId);

        if (!project.getUser().getId().equals(userId)) {
            throw new BadRequestException("You don't have permission to update this project");
        }

        if (request.getTitle() != null) project.setTitle(request.getTitle());
        if (request.getDescription() != null) project.setDescription(request.getDescription());
        if (request.getTechStack() != null) project.setTechStack(request.getTechStack());
        if (request.getGithubRepo() != null) project.setGithubRepo(request.getGithubRepo());
        if (request.getLiveDemo() != null) project.setLiveDemo(request.getLiveDemo());
        if (request.getVideoDemo() != null) project.setVideoDemo(request.getVideoDemo());
        if (request.getTags() != null) project.setTags(request.getTags());

        return projectRepository.save(project);
    }

    @Transactional
    public void deleteProject(Long projectId, Long userId) {
        Project project = getProjectById(projectId);

        if (!project.getUser().getId().equals(userId)) {
            throw new BadRequestException("You don't have permission to delete this project");
        }

        projectRepository.delete(project);
    }

    @Transactional(readOnly = true)
    public long getUserProjectCount(Long userId) {
        return projectRepository.countByUserId(userId);
    }
}
