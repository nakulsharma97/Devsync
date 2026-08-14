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
public class JoinRequestService {

    private final JoinRequestRepository joinRequestRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final ActivityService activityService;
    private final EntitlementService entitlementService;

    /**
     * PUBLIC projects: the user joins immediately.
     * PRIVATE projects: a join request is created and must be approved by the owner/admin.
     */
    @Transactional
    public JoinRequestResponse request(String projectId, String userId, JoinRequestCreateRequest request) {
        Project project = findActiveProject(projectId);
        if (memberRepository.existsByProjectIdAndUserId(projectId, userId)) {
            throw new IllegalArgumentException("You are already a member of this project");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        if (project.getVisibility() == Project.ProjectVisibility.PUBLIC) {
            entitlementService.assertCanAddMember(projectId);
            memberRepository.save(ProjectMember.builder()
                    .projectId(projectId).userId(userId).role(ProjectMember.Role.MEMBER).build());
            notifyManagers(project, "PROJECT_JOINED", "New member joined",
                    user.getFullName() + " joined " + project.getName(), userId);
            activityService.record(userId, projectId, ActivityType.USER_JOINED_PROJECT,
                    "User joined project", project.getName(), null);
            return JoinRequestResponse.builder()
                    .projectId(projectId).projectName(project.getName())
                    .userId(userId).userName(user.getFullName()).userAvatar(user.getAvatarUrl())
                    .status(JoinRequestStatus.APPROVED.name())
                    .message(request != null ? request.getMessage() : null)
                    .build();
        }

        // Keep pending join requests bounded by the member cap too.
        entitlementService.assertCanAddMember(projectId);
        if (joinRequestRepository.existsByProjectIdAndUserId(projectId, userId)) {
            throw new IllegalArgumentException("You have already requested to join this project");
        }
        JoinRequest joinRequest = joinRequestRepository.save(JoinRequest.builder()
                .projectId(projectId).userId(userId)
                .message(request != null ? request.getMessage() : null)
                .build());

        notifyManagers(project, "JOIN_REQUEST", "Join request",
                user.getFullName() + " requested to join " + project.getName(), userId);
        activityService.record(userId, projectId, ActivityType.JOIN_REQUESTED,
                "Join request sent", project.getName(), null);
        return toResponse(joinRequest, project, user);
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
        }
        joinRequest.setStatus(JoinRequestStatus.APPROVED);
        joinRequestRepository.save(joinRequest);

        User requester = userRepository.findById(joinRequest.getUserId()).orElse(null);
        notificationService.createNotification(
                joinRequest.getUserId(), "JOIN_REQUEST_APPROVED", "Join request approved",
                "Your request to join " + project.getName() + " was approved",
                managerId, "", null, project.getId(), "project", "/projects/" + project.getId());
        activityService.record(managerId, project.getId(), ActivityType.JOIN_APPROVED,
                "Join request approved", requester != null ? requester.getFullName() : "", null);
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

        notificationService.createNotification(
                joinRequest.getUserId(), "JOIN_REQUEST_REJECTED", "Join request declined",
                "Your request to join " + project.getName() + " was declined",
                managerId, "", null, project.getId(), "project", "/projects/" + project.getId());
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
