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

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;
    private final UserRepository userRepository;

    public List<ProjectResponse> getUserProjects(String userId) {
        List<Project> owned = projectRepository.findByOwnerId(userId);
        List<Project> member = projectRepository.findProjectsByUserId(userId);
        // Combine owned and member projects, dedup by ID
        Set<String> seen = new java.util.HashSet<>();
        List<ProjectResponse> results = new java.util.ArrayList<>();
        for (Project p : owned) {
            if (seen.add(p.getId())) {
                results.add(toResponse(p, userId));
            }
        }
        for (Project p : member) {
            if (seen.add(p.getId())) {
                results.add(toResponse(p, userId));
            }
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

        if (request.getName() != null) project.setName(request.getName());
        if (request.getDescription() != null) project.setDescription(request.getDescription());
        if (request.getStatus() != null) project.setStatus(Project.ProjectStatus.valueOf(request.getStatus()));
        if (request.getRepositoryUrl() != null) project.setRepositoryUrl(request.getRepositoryUrl());
        if (request.getImageUrl() != null) project.setImageUrl(request.getImageUrl());

        project = projectRepository.save(project);
        return toResponse(project, userId);
    }

    @Transactional
    public void deleteProject(String projectId) {
        if (!projectRepository.existsById(projectId)) {
            throw new ResourceNotFoundException("Project", projectId);
        }
        memberRepository.findByProjectId(projectId).forEach(memberRepository::delete);
        projectRepository.deleteById(projectId);
    }

    @Transactional
    public void addMember(String projectId, String userId, String role) {
        if (memberRepository.existsByProjectIdAndUserId(projectId, userId)) {
            throw new IllegalArgumentException("User is already a member");
        }
        ProjectMember member = ProjectMember.builder()
                .projectId(projectId)
                .userId(userId)
                .role(ProjectMember.Role.valueOf(role != null ? role : "MEMBER"))
                .build();
        memberRepository.save(member);
    }

    @Transactional
    public void removeMember(String projectId, String userId) {
        ProjectMember member = memberRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("ProjectMember", projectId + ":" + userId));
        memberRepository.delete(member);
    }

    private ProjectResponse toResponse(Project project, String currentUserId) {
        List<ProjectMember> members = memberRepository.findByProjectId(project.getId());
        long memberCount = members.size();

        List<ProjectResponse.MemberDto> memberDtos = members.stream()
                .map(m -> {
                    User user = userRepository.findById(m.getUserId()).orElse(null);
                    return ProjectResponse.MemberDto.builder()
                            .id(m.getId())
                            .userId(m.getUserId())
                            .role(m.getRole().name())
                            .fullName(user != null ? user.getFullName() : "Unknown")
                            .email(user != null ? user.getEmail() : "")
                            .avatarUrl(user != null ? user.getAvatarUrl() : null)
                            .build();
                })
                .toList();

        return ProjectResponse.builder()
                .id(project.getId())
                .name(project.getName())
                .description(project.getDescription())
                .ownerId(project.getOwnerId())
                .status(project.getStatus().name())
                .repositoryUrl(project.getRepositoryUrl())
                .imageUrl(project.getImageUrl())
                .memberCount((int) memberCount)
                .members(memberDtos)
                .createdAt(project.getCreatedAt())
                .updatedAt(project.getUpdatedAt())
                .build();
    }
}
