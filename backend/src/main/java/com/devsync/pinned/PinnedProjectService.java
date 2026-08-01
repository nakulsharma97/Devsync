package com.devsync.pinned;

import com.devsync.common.ResourceNotFoundException;
import com.devsync.pinned.dto.PinnedProjectResponse;
import com.devsync.pinned.entity.PinnedProject;
import com.devsync.pinned.repository.PinnedProjectRepository;
import com.devsync.project.entity.Project;
import com.devsync.project.entity.ProjectMember;
import com.devsync.project.repository.ProjectMemberRepository;
import com.devsync.project.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PinnedProjectService {

    private static final int MAX_PINS = 5;

    private final PinnedProjectRepository pinnedRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;

    @Transactional
    public PinnedProjectResponse pin(String projectId, String userId) {
        Project project = projectRepository.findById(projectId)
                .filter(p -> !p.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
        if (pinnedRepository.existsByUserIdAndProjectId(userId, projectId)) {
            throw new IllegalArgumentException("Project is already pinned");
        }
        if (pinnedRepository.countByUserId(userId) >= MAX_PINS) {
            throw new IllegalArgumentException("You can pin up to " + MAX_PINS + " projects");
        }
        long position = pinnedRepository.countByUserId(userId);
        PinnedProject pinned = pinnedRepository.save(PinnedProject.builder()
                .userId(userId).projectId(projectId).position((int) position).build());
        return toResponse(pinned, project, (int) memberRepository.countByProjectId(projectId));
    }

    @Transactional
    public void unpin(String projectId, String userId) {
        if (!pinnedRepository.existsByUserIdAndProjectId(userId, projectId)) {
            throw new IllegalArgumentException("Project is not pinned");
        }
        pinnedRepository.deleteByUserIdAndProjectId(userId, projectId);
    }

    @Transactional(readOnly = true)
    public List<PinnedProjectResponse> list(String userId) {
        List<PinnedProject> pinned = pinnedRepository.findByUserIdOrderByPositionAsc(userId);
        if (pinned.isEmpty()) return List.of();

        Set<String> projectIds = pinned.stream().map(PinnedProject::getProjectId).collect(Collectors.toSet());
        Map<String, Project> projectMap = projectRepository.findAllById(projectIds).stream()
                .collect(Collectors.toMap(Project::getId, p -> p));
        Map<String, Long> memberCounts = memberRepository.countMembersByProjectIdIn(projectIds).stream()
                .collect(Collectors.toMap(row -> (String) row[0], row -> (Long) row[1]));

        return pinned.stream()
                .map(p -> toResponse(p, projectMap.get(p.getProjectId()),
                        memberCounts.getOrDefault(p.getProjectId(), 0L).intValue()))
                .toList();
    }

    private PinnedProjectResponse toResponse(PinnedProject pinned, Project project, int memberCount) {
        return PinnedProjectResponse.builder()
                .id(pinned.getId())
                .projectId(pinned.getProjectId())
                .name(project != null ? project.getName() : "Unknown")
                .status(project != null && project.getStatus() != null ? project.getStatus().name() : "")
                .memberCount(memberCount)
                .build();
    }
}
