package com.devsync.collab;

import com.devsync.activity.ActivityService;
import com.devsync.activity.entity.ActivityType;
import com.devsync.billing.EntitlementService;
import com.devsync.collab.dto.JoinRequestCreateRequest;
import com.devsync.collab.dto.JoinRequestResponse;
import com.devsync.collab.entity.JoinRequest;
import com.devsync.collab.entity.JoinRequestStatus;
import com.devsync.collab.repository.JoinRequestRepository;
import com.devsync.common.ResourceNotFoundException;
import com.devsync.notification.NotificationService;
import com.devsync.project.entity.Project;
import com.devsync.teamroom.TeamRoomService;
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
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class JoinRequestService {

    private final JoinRequestRepository joinRequestRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final ActivityService activityService;
    private final EntitlementService entitlementService;
    private final TeamRoomService teamRoomService;

    /**
     * Anyone may request to join a PUBLIC project; the owner/admin must approve
     * the request before the user becomes a member. PRIVATE projects reject
     * direct requests entirely — only the owner/admin can invite users.
     */
    @Transactional
    public JoinRequestResponse request(String projectId, String userId, JoinRequestCreateRequest request) {
        Project project = findActiveProject(projectId);
        if (project.getOwnerId().equals(userId)) {
            throw new IllegalArgumentException("You cannot request to join your own project");
        }
        if (memberRepository.existsByProjectIdAndUserId(projectId, userId)) {
            throw new IllegalArgumentException("You are already a member of this project");
        }
        if (project.getVisibility() != Project.ProjectVisibility.PUBLIC) {
            throw new IllegalArgumentException(
                    "This project is private. Only the owner or an admin can invite you to join.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        // Keep pending join requests bounded by the member cap too.
        entitlementService.assertCanAddMember(projectId);
        Optional<JoinRequest> existing = joinRequestRepository.findByProjectIdAndUserId(projectId, userId);
        if (existing.isPresent()) {
            JoinRequest current = existing.get();
            if (current.getStatus() == JoinRequestStatus.PENDING) {
                throw new IllegalArgumentException("You have already requested to join this project");
            }
            // REJECTED / CANCELLED — or APPROVED with the user since removed
            // (the top-of-method check already proved non-membership) —
            // reactivate the single row (the DB unique constraint keeps one
            // request per project + user) so the user can request again
            // without creating a duplicate.
            current.setStatus(JoinRequestStatus.PENDING);
            current.setMessage(request != null ? request.getMessage() : null);
            JoinRequest reactivated = joinRequestRepository.save(current);
            notifyManagers(project, "JOIN_REQUEST", "Join request",
                    user.getFullName() + " requested to join your project " + project.getName(), userId);
            activityService.record(userId, projectId, ActivityType.JOIN_REQUESTED,
                    "Join request sent", project.getName(), null);
            return toResponse(reactivated, project, user);
        }
        JoinRequest joinRequest = joinRequestRepository.save(JoinRequest.builder()
                .projectId(projectId).userId(userId)
                .message(request != null ? request.getMessage() : null)
                .build());

        notifyManagers(project, "JOIN_REQUEST", "Join request",
                user.getFullName() + " requested to join your project " + project.getName(), userId);
        activityService.record(userId, projectId, ActivityType.JOIN_REQUESTED,
                "Join request sent", project.getName(), null);
        return toResponse(joinRequest, project, user);
    }

    /**
     * Withdraws a PENDING request. The requester may cancel their own request;
     * a project owner/admin may cancel anyone's. The row is marked CANCELLED
     * (never deleted) so the audit trail survives, and a cancelled request can
     * be re-issued later.
     */
    @Transactional
    public void cancel(String joinRequestId, String userId) {
        JoinRequest joinRequest = findJoinRequest(joinRequestId);
        if (joinRequest.getStatus() != JoinRequestStatus.PENDING) {
            throw new IllegalArgumentException("This request is no longer pending");
        }
        boolean requester = joinRequest.getUserId().equals(userId);
        boolean manager = false;
        if (!requester) {
            manager = canManage(findActiveProject(joinRequest.getProjectId()), userId);
        }
        if (!requester && !manager) {
            throw new IllegalArgumentException("Only the requester or a project manager can cancel this request");
        }
        joinRequest.setStatus(JoinRequestStatus.CANCELLED);
        joinRequestRepository.save(joinRequest);
    }

    @Transactional
    public void approve(String joinRequestId, String managerId) {
        JoinRequest joinRequest = findJoinRequest(joinRequestId);
        Project project = findActiveProject(joinRequest.getProjectId());
        assertCanManage(project, managerId);
        if (joinRequest.getStatus() != JoinRequestStatus.PENDING) {
            throw new IllegalArgumentException("This request is no longer pending");
        }
        if (!memberRepository.existsByProjectIdAndUserId(project.getId(), joinRequest.getUserId())) {
            entitlementService.assertCanAddMember(project.getId());
            memberRepository.save(ProjectMember.builder()
                    .projectId(project.getId()).userId(joinRequest.getUserId())
                    .role(ProjectMember.Role.MEMBER).build());
            // Accepted members join the team chat in the same transaction — a
            // member can never exist without access to the project's chat.
            teamRoomService.addProjectMemberToRoom(project.getId(), joinRequest.getUserId());
        }
        joinRequest.setStatus(JoinRequestStatus.APPROVED);
        joinRequestRepository.save(joinRequest);

        User requester = userRepository.findById(joinRequest.getUserId()).orElse(null);
        notificationService.createNotification(
                joinRequest.getUserId(), "JOIN_REQUEST_APPROVED", "Join request approved",
                "Your request to join " + project.getName() + " was accepted",
                managerId, "", null, project.getId(), "project", "/projects/" + project.getId());
        activityService.record(managerId, project.getId(), ActivityType.JOIN_APPROVED,
                "Join request accepted", requester != null ? requester.getFullName() : "", null);
    }

    @Transactional
    public void reject(String joinRequestId, String managerId) {
        JoinRequest joinRequest = findJoinRequest(joinRequestId);
        Project project = findActiveProject(joinRequest.getProjectId());
        assertCanManage(project, managerId);
        if (joinRequest.getStatus() != JoinRequestStatus.PENDING) {
            throw new IllegalArgumentException("This request is no longer pending");
        }
        joinRequest.setStatus(JoinRequestStatus.REJECTED);
        joinRequestRepository.save(joinRequest);

        User requester = userRepository.findById(joinRequest.getUserId()).orElse(null);
        notificationService.createNotification(
                joinRequest.getUserId(), "JOIN_REQUEST_REJECTED", "Join request declined",
                "Your request to join " + project.getName() + " was declined",
                managerId, "", null, project.getId(), "project", "/projects/" + project.getId());
        activityService.record(managerId, project.getId(), ActivityType.JOIN_REJECTED,
                "Join request declined", requester != null ? requester.getFullName() : "", null);
    }

    /**
     * The caller's own join requests, newest first. When {@code projectId} is
     * supplied the list is narrowed to that project — used by the requester to
     * render "Request Pending" and to cancel their pending request.
     */
    public List<JoinRequestResponse> listMine(String userId, String projectId) {
        List<JoinRequest> requests = joinRequestRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (projectId != null && !projectId.isBlank()) {
            requests = requests.stream()
                    .filter(jr -> jr.getProjectId().equals(projectId))
                    .toList();
        }
        if (requests.isEmpty()) return List.of();
        Set<String> projectIds = requests.stream().map(JoinRequest::getProjectId).collect(Collectors.toSet());
        Map<String, Project> projectMap = projectRepository.findAllById(projectIds).stream()
                .collect(Collectors.toMap(Project::getId, p -> p));
        return requests.stream()
                .map(jr -> toResponse(jr, projectMap.get(jr.getProjectId()),
                        userRepository.findById(jr.getUserId()).orElse(null)))
                .toList();
    }

    public List<JoinRequestResponse> listForProject(String projectId, String managerId) {
        Project project = findActiveProject(projectId);
        assertCanManage(project, managerId);
        List<JoinRequest> requests = joinRequestRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
        if (requests.isEmpty()) return List.of();
        Set<String> userIds = requests.stream().map(JoinRequest::getUserId).collect(Collectors.toSet());
        Map<String, User> userMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
        return requests.stream()
                .map(jr -> toResponse(jr, project, userMap.get(jr.getUserId())))
                .toList();
    }

    private JoinRequestResponse toResponse(JoinRequest joinRequest, Project project, User user) {
        return JoinRequestResponse.builder()
                .id(joinRequest.getId())
                .projectId(joinRequest.getProjectId())
                .projectName(project != null ? project.getName() : "")
                .userId(joinRequest.getUserId())
                .userName(user != null ? user.getFullName() : "Unknown")
                .userAvatar(user != null ? user.getAvatarUrl() : null)
                .status(joinRequest.getStatus().name())
                .message(joinRequest.getMessage())
                .createdAt(joinRequest.getCreatedAt())
                .build();
    }

    private void notifyManagers(Project project, String type, String title, String message, String actorId) {
        User actor = userRepository.findById(actorId).orElse(null);
        String actorName = actor != null ? actor.getFullName() : "";
        String actorAvatar = actor != null ? actor.getAvatarUrl() : null;
        List<ProjectMember> managers = memberRepository.findByProjectId(project.getId()).stream()
                .filter(m -> m.getRole() == ProjectMember.Role.ADMIN || m.getUserId().equals(project.getOwnerId()))
                .toList();
        for (ProjectMember manager : managers) {
            if (manager.getUserId().equals(actorId)) continue;
            notificationService.createNotification(
                    manager.getUserId(), type, title, message,
                    actorId, actorName, actorAvatar,
                    project.getId(), "project", "/projects/" + project.getId());
        }
    }

    private boolean canManage(Project project, String userId) {
        if (project.getOwnerId().equals(userId)) return true;
        return memberRepository.findByProjectIdAndUserId(project.getId(), userId)
                .filter(m -> m.getRole() == ProjectMember.Role.ADMIN)
                .isPresent();
    }

    private void assertCanManage(Project project, String userId) {
        if (!canManage(project, userId)) {
            throw new IllegalArgumentException("Only the project owner or an admin can manage join requests");
        }
    }

    private JoinRequest findJoinRequest(String joinRequestId) {
        return joinRequestRepository.findById(joinRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("JoinRequest", joinRequestId));
    }

    private Project findActiveProject(String projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
        if (project.isDeleted()) {
            throw new ResourceNotFoundException("Project", projectId);
        }
        if (project.getStatus() == Project.ProjectStatus.ARCHIVED) {
            throw new IllegalArgumentException("This project is archived");
        }
        return project;
    }
}
