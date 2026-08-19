package com.devsync.project;

import com.devsync.activity.ActivityService;
import com.devsync.activity.entity.ActivityType;
import com.devsync.billing.EntitlementService;
import com.devsync.collab.JoinRequestService;
import com.devsync.collab.entity.InvitationStatus;
import com.devsync.collab.entity.JoinRequest;
import com.devsync.collab.entity.JoinRequestStatus;
import com.devsync.collab.repository.JoinRequestRepository;
import com.devsync.collab.repository.ProjectInvitationRepository;
import com.devsync.teamroom.TeamRoomService;
import com.devsync.common.ForbiddenException;
import com.devsync.common.ResourceNotFoundException;
import com.devsync.kanban.entity.Board;
import com.devsync.kanban.entity.Task;
import com.devsync.kanban.repository.BoardRepository;
import com.devsync.kanban.repository.TaskRepository;
import com.devsync.notification.NotificationService;
import com.devsync.presence.PresenceService;
import com.devsync.project.dto.CreateProjectRequest;
import com.devsync.project.dto.ProjectResponse;
import com.devsync.project.dto.PublicProjectSummaryResponse;
import com.devsync.project.dto.UpdateProjectRequest;
import com.devsync.project.entity.Project;
import com.devsync.project.entity.ProjectMember;
import com.devsync.project.repository.ProjectMemberRepository;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private static final int DISCOVER_LIMIT = 50;

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final ActivityService activityService;
    private final NotificationService notificationService;
    private final PresenceService presenceService;
    private final EntitlementService entitlementService;
    private final ProjectTemplateService templateService;
    private final JoinRequestRepository joinRequestRepository;
    private final JoinRequestService joinRequestService;
    private final TeamRoomService teamRoomService;
    private final ProjectInvitationRepository invitationRepository;
    private final BoardRepository boardRepository;
    private final TaskRepository taskRepository;

    public List<ProjectResponse> getUserProjects(String userId) {
        List<Project> owned = projectRepository.findByOwnerId(userId);
        List<Project> member = projectRepository.findProjectsByUserId(userId);
        Set<String> seen = new HashSet<>();
        List<ProjectResponse> results = new java.util.ArrayList<>();
        for (Project p : owned) {
            if (seen.add(p.getId())) results.add(toResponse(p, userId));
        }
        for (Project p : member) {
            if (seen.add(p.getId())) results.add(toResponse(p, userId));
        }
        return results;
    }

    /**
     * Discover PUBLIC projects for the network/discover page. Batch-loads members
     * and users so there are no N+1 queries across the result set.
     */
    public List<PublicProjectSummaryResponse> discoverPublicProjects(String search, String userId) {
        List<Project> projects = projectRepository.discoverPublicProjects(
                Project.ProjectStatus.ACTIVE,
                Project.ProjectVisibility.PUBLIC,
                search == null || search.isBlank() ? null : search.trim(),
                PageRequest.of(0, DISCOVER_LIMIT));
        if (projects.isEmpty()) return List.of();

        Set<String> projectIds = projects.stream().map(Project::getId).collect(Collectors.toSet());
        // Only load members to get counts and owner info — no presence, no lastActiveAt.
        List<ProjectMember> allMembers = memberRepository.findByProjectIdIn(projectIds);
        Map<String, List<ProjectMember>> membersByProject = allMembers.stream()
                .collect(Collectors.groupingBy(ProjectMember::getProjectId));
        Map<String, Long> memberCounts = membersByProject.entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, e -> (long) e.getValue().size()));
        Set<String> ownerIds = projects.stream().map(Project::getOwnerId).collect(Collectors.toSet());
        Map<String, User> ownerMap = ownerIds.isEmpty() ? java.util.Collections.emptyMap()
                : userRepository.findAllById(ownerIds).stream()
                        .collect(Collectors.toMap(User::getId, u -> u));

        // Batch-load the caller's own join-request status across the result set
        // so the discovery UI can render a pending state without N+1 lookups.
        Map<String, String> joinStatusByProject = joinRequestRepository
                .findByProjectIdInAndUserId(projectIds, userId).stream()
                .collect(Collectors.toMap(JoinRequest::getProjectId,
                        jr -> jr.getStatus().name(), (a, b) -> a));

        return projects.stream()
                .map(p -> {
                    User owner = ownerMap.get(p.getOwnerId());
                    return PublicProjectSummaryResponse.builder()
                            .id(p.getId())
                            .name(p.getName())
                            .description(p.getDescription())
                            .ownerId(p.getOwnerId())
                            .ownerName(owner != null ? owner.getFullName() : null)
                            .ownerAvatarUrl(owner != null ? owner.getAvatarUrl() : null)
                            .status(p.getStatus() != null ? p.getStatus().name() : "ACTIVE")
                            .repositoryUrl(p.getRepositoryUrl())
                            .imageUrl(p.getImageUrl())
                            .memberCount(memberCounts.getOrDefault(p.getId(), 0L).intValue())
                            .visibility(p.getVisibility() != null ? p.getVisibility().name() : "PUBLIC")
                            .currentUserJoinRequestStatus(joinStatusByProject.get(p.getId()))
                            .createdAt(p.getCreatedAt())
                            .updatedAt(p.getUpdatedAt())
                            .build();
                })
                .toList();
    }

    @Transactional
    public ProjectResponse createProject(CreateProjectRequest request, String ownerId) {
        Project.ProjectVisibility visibility = parseVisibility(request.getVisibility());
        // Server-side plan enforcement: private projects are capped by the
        // owner's plan (FREE = 2). The user row is locked so two concurrent
        // creations cannot both race past the limit.
        if (visibility == Project.ProjectVisibility.PRIVATE) {
            entitlementService.assertCanCreatePrivateProject(ownerId);
        }
        Project project = Project.builder()
                .name(request.getName())
                .description(request.getDescription())
                .ownerId(ownerId)
                .visibility(visibility)
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

        // The project's team chat is created automatically and the owner joins
        // it — same transaction, so a project can never exist without its chat.
        teamRoomService.addProjectMemberToRoom(project.getId(), ownerId);

        if (request.getTemplate() != null && templateService.supports(request.getTemplate())) {
            templateService.seed(project.getId(), ownerId, request.getTemplate());
        }

        activityService.record(ownerId, project.getId(), ActivityType.PROJECT_CREATED,
                "Project created", project.getName(), null);
        return toResponse(project, ownerId);
    }

    /**
     * Visibility rules: PUBLIC projects are visible to everyone; PRIVATE projects
     * are visible only to members, the owner, or platform admins.
     */
    public ProjectResponse getProject(String projectId, String userId) {
        Project project = findActive(projectId);
        if (!canView(project, userId)) {
            throw new IllegalArgumentException("This project is private");
        }
        return toResponse(project, userId);
    }

    @Transactional
    public ProjectResponse updateProject(String projectId, UpdateProjectRequest request, String userId) {
        Project project = findActive(projectId);
        if (project.getStatus() == Project.ProjectStatus.ARCHIVED) {
            throw new IllegalArgumentException("Archived projects cannot be edited");
        }
        // Only project owner or admin members can update the project
        if (!project.getOwnerId().equals(userId)) {
            boolean isAdmin = memberRepository.findByProjectIdAndUserId(projectId, userId)
                    .filter(m -> m.getRole() == ProjectMember.Role.ADMIN).isPresent();
            if (!isAdmin) throw new ForbiddenException("No permission to update this project");
        }
        if (request.getName() != null) project.setName(request.getName());
        if (request.getDescription() != null) project.setDescription(request.getDescription());
        if (request.getStatus() != null) project.setStatus(Project.ProjectStatus.valueOf(request.getStatus()));
        if (request.getRepositoryUrl() != null) project.setRepositoryUrl(request.getRepositoryUrl());
        if (request.getImageUrl() != null) project.setImageUrl(request.getImageUrl());
        project = projectRepository.save(project);
        activityService.record(userId, projectId, ActivityType.PROJECT_UPDATED,
                "Project updated", project.getName(), null);
        return toResponse(project, userId);
    }

    /**
     * Soft-deletes the project: the row is flagged {@code deleted} and kept so all
     * related records (members, boards, tasks, rooms, messages, attachments,
     * invitations, notifications, audit) stay consistent and historically intact.
     * Every read path excludes deleted projects and every resource service rejects
     * access to them, so a soft-deleted project is unreachable without destroying
     * audit history or leaving orphan records behind.
     */
    @Transactional
    public void deleteProject(String projectId, String currentUserId) {
        Project project = findActive(projectId);
        if (!project.getOwnerId().equals(currentUserId))
            throw new ForbiddenException("Only the project owner can delete this project");
        project.setDeleted(true);
        project.setDeletedAt(Instant.now());
        projectRepository.save(project);
        activityService.record(currentUserId, projectId, ActivityType.PROJECT_DELETED,
                "Project deleted", project.getName(), null);
    }

    @Transactional
    public void addMember(String projectId, String userId, String role, String currentUserId) {
        Project project = findActive(projectId);
        if (!project.getOwnerId().equals(currentUserId)) {
            boolean isAdmin = memberRepository.findByProjectIdAndUserId(projectId, currentUserId)
                    .filter(m -> m.getRole() == ProjectMember.Role.ADMIN).isPresent();
            if (!isAdmin) throw new ForbiddenException("No permission to add members");
        }
        entitlementService.assertCanAddMember(projectId);
        if (memberRepository.existsByProjectIdAndUserId(projectId, userId))
            throw new IllegalArgumentException("User is already a member");
        ProjectMember.Role memberRole = parseMemberRole(role);
        memberRepository.save(ProjectMember.builder()
                .projectId(projectId).userId(userId)
                .role(memberRole).build());
        teamRoomService.addProjectMemberToRoom(projectId, userId);
        activityService.record(currentUserId, projectId, ActivityType.USER_JOINED_PROJECT,
                "User joined project", userId, null);
        notifyMemberAdded(project, userId, currentUserId);
    }

    /**
     * Owner-only member removal. Access is revoked atomically: the membership is
     * deleted, the user is removed from the project's team chat, pending join
     * requests / invitations are invalidated so they cannot re-enter through a
     * stale approval, and tasks they were assigned are unassigned for
     * reassignment. Tasks, files, docs and activity are preserved — only access
     * is removed. Direct messages are untouched.
     */
    @Transactional
    public void removeMember(String projectId, String userId, String currentUserId) {
        Project project = findActive(projectId);
        if (!project.getOwnerId().equals(currentUserId))
            throw new ForbiddenException("Only the project owner can remove members");
        if (project.getOwnerId().equals(userId))
            throw new IllegalArgumentException("Cannot remove the project owner");
        ProjectMember member = memberRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("ProjectMember", projectId + ":" + userId));
        memberRepository.delete(member);
        teamRoomService.removeProjectMemberFromRoom(projectId, userId);

        // Cancel a pending join request / invitation so a stale approval can
        // never restore access after removal.
        joinRequestRepository.findByProjectIdAndUserId(projectId, userId)
                .filter(jr -> jr.getStatus() == JoinRequestStatus.PENDING)
                .ifPresent(jr -> {
                    jr.setStatus(JoinRequestStatus.CANCELLED);
                    joinRequestRepository.save(jr);
                });
        invitationRepository.findFirstByProjectIdAndReceiverIdAndStatus(
                        projectId, userId, InvitationStatus.PENDING)
                .ifPresent(inv -> {
                    inv.setStatus(InvitationStatus.EXPIRED);
                    invitationRepository.save(inv);
                });

        // Unassign the removed user's tasks so they surface for reassignment.
        // The tasks themselves are kept — no project work is lost.
        List<Board> boards = boardRepository.findByProjectId(projectId);
        if (boards != null && !boards.isEmpty()) {
            List<Task> tasks = taskRepository.findByBoardIdIn(
                    boards.stream().map(Board::getId).toList());
            for (Task task : tasks) {
                if (userId.equals(task.getAssigneeId())) {
                    task.setAssigneeId(null);
                    taskRepository.save(task);
                }
            }
        }

        User removed = userRepository.findById(userId).orElse(null);
        activityService.record(currentUserId, projectId, ActivityType.USER_LEFT_PROJECT,
                "User removed from project",
                (removed != null ? removed.getFullName() : "A user") + " was removed from the project", null);
        notifyMemberRemoved(project, userId, currentUserId);
    }

    /**
     * Transfers project ownership to another existing member. Runs in one
     * transaction under a pessimistic lock on the project row: two concurrent
     * transfers serialize, and the loser re-reads the committed row after the
     * winner commits, so it is rejected instead of racing. Exactly one OWNER is
     * guaranteed — the previous owner becomes a MEMBER and keeps their
     * membership, team-chat access and project data.
     */
    @Transactional
    public ProjectResponse transferOwnership(String projectId, String targetUserId, String currentUserId) {
        Project project = projectRepository.findByIdForUpdate(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
        if (project.isDeleted()) {
            throw new ResourceNotFoundException("Project", projectId);
        }
        if (project.getStatus() == Project.ProjectStatus.ARCHIVED) {
            throw new IllegalArgumentException("This project is archived");
        }
        if (!project.getOwnerId().equals(currentUserId)) {
            throw new ForbiddenException("Only the project owner can transfer ownership");
        }
        if (targetUserId == null || targetUserId.isBlank()) {
            throw new IllegalArgumentException("A target member is required");
        }
        if (project.getOwnerId().equals(targetUserId)) {
            throw new IllegalArgumentException("This user is already the project owner");
        }
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("Target user not found"));
        if (targetUser.isDeleted()) {
            throw new IllegalArgumentException("Target user not found");
        }
        // The target must currently be a project member — ownership cannot be
        // transferred to an arbitrary (non-member) user.
        ProjectMember newOwner = memberRepository.findByProjectIdAndUserId(projectId, targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("Target user is not a member of this project"));
        ProjectMember oldOwner = memberRepository.findByProjectIdAndUserId(projectId, currentUserId)
                .orElseThrow(() -> new IllegalArgumentException("Current owner membership not found"));

        newOwner.setRole(ProjectMember.Role.OWNER);
        oldOwner.setRole(ProjectMember.Role.MEMBER);
        memberRepository.save(newOwner);
        memberRepository.save(oldOwner);
        project.setOwnerId(targetUserId);
        projectRepository.save(project);

        String targetName = targetUser.getFullName() != null ? targetUser.getFullName() : targetUserId;
        User actor = userRepository.findById(currentUserId).orElse(null);
        String actorName = actor != null ? actor.getFullName() : currentUserId;

        notificationService.createNotification(
                targetUserId, "OWNERSHIP_TRANSFERRED", "You are now the owner",
                "You are now the owner of " + project.getName(),
                currentUserId, actorName, actor != null ? actor.getAvatarUrl() : null,
                projectId, "project", "/projects/" + projectId);
        notificationService.createNotification(
                currentUserId, "OWNERSHIP_TRANSFERRED", "Ownership transferred",
                "Project ownership of " + project.getName() + " was transferred to " + targetName,
                targetUserId, targetName, targetUser.getAvatarUrl(),
                projectId, "project", "/projects/" + projectId);

        activityService.record(currentUserId, projectId, ActivityType.OWNERSHIP_TRANSFERRED,
                "Ownership transferred", project.getName() + " → " + targetName, targetUserId);
        activityService.record(targetUserId, projectId, ActivityType.OWNERSHIP_TRANSFERRED,
                "Became project owner", project.getName(), null);

        // currentUserId is now a MEMBER, so the response reflects the new state
        // immediately (the frontend refreshes anyway).
        return toResponse(project, currentUserId);
    }

    /**
     * PUBLIC projects: an authenticated user requests to join and becomes a
     * member only after the owner/admin approves. Delegates to the join-request
     * flow so the backend can never bypass owner approval (this endpoint exists
     * for legacy clients; the frontend uses /join-request directly).
     * PRIVATE projects reject direct join attempts with a clear message.
     */
    @Transactional
    public void joinPublicProject(String projectId, String userId) {
        joinRequestService.request(projectId, userId, null);
    }

    @Transactional
    public void updateMemberRole(String projectId, String memberUserId, String role, String currentUserId) {
        Project project = findActive(projectId);
        if (!project.getOwnerId().equals(currentUserId)) {
            throw new ForbiddenException("Only the project owner can change member roles");
        }
        if (project.getOwnerId().equals(memberUserId)) {
            throw new IllegalArgumentException("Cannot change the role of the project owner");
        }
        ProjectMember.Role newRole = parseMemberRole(role);
        ProjectMember member = memberRepository.findByProjectIdAndUserId(projectId, memberUserId)
                .orElseThrow(() -> new ResourceNotFoundException("ProjectMember", projectId + ":" + memberUserId));
        member.setRole(newRole);
        memberRepository.save(member);

        User memberUser = userRepository.findById(memberUserId).orElse(null);
        activityService.record(currentUserId, projectId, ActivityType.MEMBER_ROLE_CHANGED,
                "Member role changed",
                (memberUser != null ? memberUser.getFullName() : memberUserId) + " -> " + newRole, null);
        notificationService.createNotification(
                memberUserId, "MEMBER_ROLE_CHANGED", "Role changed",
                "Your role in " + project.getName() + " is now " + newRole,
                currentUserId, "", null, projectId, "project", "/projects/" + projectId);
    }

    @Transactional
    public ProjectResponse changeVisibility(String projectId, String visibility, String currentUserId) {
        Project project = findActive(projectId);
        if (!project.getOwnerId().equals(currentUserId)) {
            boolean isAdmin = memberRepository.findByProjectIdAndUserId(projectId, currentUserId)
                    .filter(m -> m.getRole() == ProjectMember.Role.ADMIN).isPresent();
            if (!isAdmin) throw new ForbiddenException("Only the project owner or an admin can change visibility");
        }
        Project.ProjectVisibility newVisibility = Project.ProjectVisibility.valueOf(visibility);
        project.setVisibility(newVisibility);
        projectRepository.save(project);

        activityService.record(currentUserId, projectId, ActivityType.PROJECT_VISIBILITY_CHANGED,
                "Project visibility changed", newVisibility.name(), null);
        List<ProjectMember> members = memberRepository.findByProjectId(projectId);
        for (ProjectMember m : members) {
            if (m.getUserId().equals(currentUserId)) continue;
            notificationService.createNotification(
                    m.getUserId(), "PROJECT_VISIBILITY_CHANGED", "Project visibility changed",
                    project.getName() + " is now " + newVisibility.name().toLowerCase(),
                    currentUserId, "", null, projectId, "project", "/projects/" + projectId);
        }
        return toResponse(project, currentUserId);
    }

    private void notifyMemberAdded(Project project, String addedUserId, String actorId) {
        User added = userRepository.findById(addedUserId).orElse(null);
        User actor = userRepository.findById(actorId).orElse(null);
        if (added == null || addedUserId.equals(actorId)) return;
        notificationService.createNotification(
                addedUserId, "MEMBER_ADDED", "Added to project",
                (actor != null ? actor.getFullName() : "Someone") + " added you to " + project.getName(),
                actorId, actor != null ? actor.getFullName() : "",
                actor != null ? actor.getAvatarUrl() : null,
                project.getId(), "project", "/projects/" + project.getId());
    }

    private void notifyMemberRemoved(Project project, String removedUserId, String actorId) {
        User actor = userRepository.findById(actorId).orElse(null);
        notificationService.createNotification(
                removedUserId, "MEMBER_REMOVED", "Removed from project",
                "You were removed from " + project.getName(),
                actorId, actor != null ? actor.getFullName() : "",
                actor != null ? actor.getAvatarUrl() : null,
                project.getId(), "project", "/projects/" + project.getId());
    }

    private boolean canView(Project project, String userId) {
        if (project.getVisibility() == Project.ProjectVisibility.PUBLIC) return true;
        User user = userRepository.findById(userId).orElse(null);
        if (user != null && user.getRole() == User.Role.ADMIN) return true;
        return memberRepository.existsByProjectIdAndUserId(project.getId(), userId);
    }

    /**
     * Parses an optional visibility value, defaulting to PRIVATE. PUBLIC/PRIVATE
     * are case-insensitive; anything else is rejected rather than silently ignored.
     */
    private Project.ProjectVisibility parseVisibility(String visibility) {
        if (visibility == null || visibility.isBlank()) {
            return Project.ProjectVisibility.PRIVATE;
        }
        try {
            return Project.ProjectVisibility.valueOf(visibility.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(
                    "Invalid visibility: " + visibility + " (expected PUBLIC or PRIVATE)");
        }
    }

    private ProjectMember.Role parseMemberRole(String role) {
        if (role == null || role.isBlank()) {
            return ProjectMember.Role.MEMBER;
        }
        try {
            ProjectMember.Role parsed = ProjectMember.Role.valueOf(role.trim().toUpperCase());
            if (parsed == ProjectMember.Role.OWNER) {
                throw new IllegalArgumentException("Cannot assign the OWNER role");
            }
            return parsed;
        } catch (IllegalArgumentException e) {
            if (e.getMessage().contains("Cannot assign the OWNER role")) throw e;
            throw new IllegalArgumentException("Invalid role: " + role + " (expected ADMIN, MEMBER, or VIEWER)");
        }
    }

    private Project findActive(String projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
        if (project.isDeleted()) {
            throw new ResourceNotFoundException("Project", projectId);
        }
        return project;
    }

    private ProjectResponse toResponse(Project project, String userId) {
        List<ProjectMember> members = memberRepository.findByProjectId(project.getId());
        Set<String> userIds = members.stream().map(ProjectMember::getUserId).collect(Collectors.toSet());
        Map<String, User> userMap = userIds.isEmpty() ? java.util.Collections.emptyMap()
                : userRepository.findAllById(userIds).stream()
                        .collect(Collectors.toMap(User::getId, u -> u));
        String currentUserRole = members.stream()
                .filter(m -> m.getUserId().equals(userId))
                .map(m -> m.getRole().name())
                .findFirst()
                .orElse(null);
        String currentUserJoinRequestStatus = joinRequestRepository
                .findByProjectIdAndUserId(project.getId(), userId)
                .map(jr -> jr.getStatus().name())
                .orElse(null);
        return toResponse(project, members, userMap, currentUserRole, currentUserJoinRequestStatus);
    }

    private ProjectResponse toResponse(Project project, List<ProjectMember> members,
                                       Map<String, User> userMap, String currentUserRole,
                                       String currentUserJoinRequestStatus) {
        List<ProjectResponse.MemberDto> memberDtos = members.stream()
                .map(m -> {
                    User user = userMap.get(m.getUserId());
                    return ProjectResponse.MemberDto.builder()
                            .id(m.getId()).userId(m.getUserId()).role(m.getRole().name())
                            .fullName(user != null ? user.getFullName() : "Unknown")
                            .avatarUrl(user != null ? user.getAvatarUrl() : null)
                            .username(user != null ? user.getUsername() : null)
                            .presenceStatus(user != null ? presenceService.effectiveStatus(user) : "OFFLINE")
                            .lastActiveAt(user != null ? user.getLastActiveAt() : null)
                            .joinedAt(m.getCreatedAt())
                            .build();
                })
                .toList();

        return ProjectResponse.builder()
                .id(project.getId()).name(project.getName()).description(project.getDescription())
                .ownerId(project.getOwnerId()).status(project.getStatus().name())
                .visibility(project.getVisibility() != null ? project.getVisibility().name() : "PUBLIC")
                .currentUserRole(currentUserRole)
                .currentUserJoinRequestStatus(currentUserJoinRequestStatus)
                .repositoryUrl(project.getRepositoryUrl()).imageUrl(project.getImageUrl())
                .memberCount(members.size()).members(memberDtos)
                .createdAt(project.getCreatedAt()).updatedAt(project.getUpdatedAt())
                .build();
    }
}
