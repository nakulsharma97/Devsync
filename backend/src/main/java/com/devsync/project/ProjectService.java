package com.devsync.project;

import com.devsync.common.ResourceNotFoundException;
import com.devsync.project.dto.CreateProjectRequest;
import com.devsync.project.dto.ProjectResponse;
import com.devsync.project.dto.UpdateProjectRequest;
import com.devsync.project.entity.Project;
import com.devsync.project.entity.ProjectMember;
import com.devsync.project.repository.ProjectMemberRepository;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;
    private final UserRepository userRepository;

    public List<ProjectResponse> getUserProjects(String userId) {
        List<Project> owned = projectRepository.findByOwnerId(userId);
        List<Project> member = projectRepository.findProjectsByUserId(userId);
        Set<String> seen = new java.util.HashSet<>();
        List<ProjectResponse> results = new java.util.ArrayList<>();
        for (Project p : owned) {
            if (seen.add(p.getId())) results.add(toResponse(p, userId));
        }
        for (Project p : member) {
            if (seen.add(p.getId())) results.add(toResponse(p, userId));
        }
        return results;
    }

    @Transactional
    public ProjectResponse createProject(CreateProjectRequest request, String ownerId) {
        Project project = Project.builder()
                .name(request.getName())
                .description(request.getDescription())
                .ownerId(ownerId)
                .repositoryUrl(request.getRepositoryUrl())
                .imageUrl(request.getImageUrl())
                .build();
        project = projectRepository.save(project);

        ProjectMember ownerMember = ProjectMember.builder()
                .projectId(project.getId())
                .userId(ownerId)
                .role(ProjectMember.Role.OWNER)
                .build();
        memberRepository.save(ownerMember);

        return toResponse(project, ownerId);
    }

    public ProjectResponse getProject(String projectId, String userId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
        return toResponse(project, userId);
    }

    @Transactional
    public ProjectResponse updateProject(String projectId, UpdateProjectRequest request, String userId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
        // Only project owner or admin members can update the project
        if (!project.getOwnerId().equals(userId)) {
            boolean isAdmin = memberRepository.findByProjectIdAndUserId(projectId, userId)
                    .filter(m -> m.getRole() == ProjectMember.Role.ADMIN).isPresent();
            if (!isAdmin) throw new IllegalArgumentException("No permission to update this project");
        }
        if (request.getName() != null) project.setName(request.getName());
        if (request.getDescription() != null) project.setDescription(request.getDescription());
        if (request.getStatus() != null) project.setStatus(Project.ProjectStatus.valueOf(request.getStatus()));
        if (request.getRepositoryUrl() != null) project.setRepositoryUrl(request.getRepositoryUrl());
        if (request.getImageUrl() != null) project.setImageUrl(request.getImageUrl());
        project = projectRepository.save(project);
        return toResponse(project, userId);
    }

    @Transactional
    public void deleteProject(String projectId, String currentUserId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
        if (!project.getOwnerId().equals(currentUserId))
            throw new IllegalArgumentException("Only the project owner can delete this project");
        memberRepository.findByProjectId(projectId).forEach(memberRepository::delete);
        projectRepository.deleteById(projectId);
    }

    @Transactional
    public void addMember(String projectId, String userId, String role, String currentUserId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
        if (!project.getOwnerId().equals(currentUserId)) {
            boolean isAdmin = memberRepository.findByProjectIdAndUserId(projectId, currentUserId)
                    .filter(m -> m.getRole() == ProjectMember.Role.ADMIN).isPresent();
            if (!isAdmin) throw new IllegalArgumentException("No permission to add members");
        }
        if (memberRepository.existsByProjectIdAndUserId(projectId, userId))
            throw new IllegalArgumentException("User is already a member");
        memberRepository.save(ProjectMember.builder()
                .projectId(projectId).userId(userId)
                .role(ProjectMember.Role.valueOf(role != null ? role : "MEMBER")).build());
    }

    @Transactional
    public void removeMember(String projectId, String userId, String currentUserId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
        if (!project.getOwnerId().equals(currentUserId))
            throw new IllegalArgumentException("Only the project owner can remove members");
        if (project.getOwnerId().equals(userId))
            throw new IllegalArgumentException("Cannot remove the project owner");
        ProjectMember member = memberRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("ProjectMember", projectId + ":" + userId));
        memberRepository.delete(member);
    }

    private ProjectResponse toResponse(Project project, String currentUserId) {
        List<ProjectMember> members = memberRepository.findByProjectId(project.getId());

        // Batch-load all member users (fixes N+1)
        Set<String> userIds = members.stream().map(ProjectMember::getUserId).collect(Collectors.toSet());
        Map<String, User> userMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        List<ProjectResponse.MemberDto> memberDtos = members.stream()
                .map(m -> {
                    User user = userMap.get(m.getUserId());
                    return ProjectResponse.MemberDto.builder()
                            .id(m.getId()).userId(m.getUserId()).role(m.getRole().name())
                            .fullName(user != null ? user.getFullName() : "Unknown")
                            .email(user != null ? user.getEmail() : "")
                            .avatarUrl(user != null ? user.getAvatarUrl() : null)
                            .build();
                })
                .toList();

        return ProjectResponse.builder()
                .id(project.getId()).name(project.getName()).description(project.getDescription())
                .ownerId(project.getOwnerId()).status(project.getStatus().name())
                .repositoryUrl(project.getRepositoryUrl()).imageUrl(project.getImageUrl())
                .memberCount(members.size()).members(memberDtos)
                .createdAt(project.getCreatedAt()).updatedAt(project.getUpdatedAt())
                .build();
    }
}
