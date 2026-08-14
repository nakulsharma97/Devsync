package com.devsync.collab;

import com.devsync.activity.ActivityService;
import com.devsync.activity.entity.ActivityType;
import com.devsync.billing.EntitlementService;
import com.devsync.collab.dto.InvitationResponse;
import com.devsync.collab.dto.InviteRequest;
import com.devsync.collab.entity.InvitationStatus;
import com.devsync.collab.entity.ProjectInvitation;
import com.devsync.collab.repository.ProjectInvitationRepository;
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

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InvitationService {

    private static final Duration INVITATION_VALIDITY = Duration.ofDays(7);

    private final ProjectInvitationRepository invitationRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final ActivityService activityService;
    private final EntitlementService entitlementService;

    @Transactional
    public InvitationResponse invite(String projectId, InviteRequest request, String senderId) {
        Project project = findActiveProject(projectId);
        assertCanManage(project, senderId);

        // Plan member cap (owner's plan): enforced before the invitation is
        // created so pending invitations can never exceed the active-member limit.
        entitlementService.assertCanAddMember(projectId);

        User receiver = resolveInvitee(request);
        if (receiver.getId().equals(senderId)) {
            throw new IllegalArgumentException("You cannot invite yourself");
        }
        if (memberRepository.existsByProjectIdAndUserId(projectId, receiver.getId())) {
            throw new IllegalArgumentException("User is already a member of this project");
        }
        if (invitationRepository.existsByProjectIdAndReceiverIdAndStatus(
                projectId, receiver.getId(), InvitationStatus.PENDING)) {
            throw new IllegalArgumentException("An invitation is already pending for this user");
        }

        User sender = userRepository.findById(senderId).orElse(null);
        ProjectInvitation invitation = invitationRepository.save(ProjectInvitation.builder()
                .projectId(projectId)
                .senderId(senderId)
                .receiverId(receiver.getId())
                .message(request.getMessage())
                .expiresAt(Instant.now().plus(INVITATION_VALIDITY))
                .build());

        notificationService.createNotification(
                receiver.getId(), "PROJECT_INVITE", "Project invitation",
                (sender != null ? sender.getFullName() : "Someone") + " invited you to join " + project.getName(),
                senderId, sender != null ? sender.getFullName() : "",
                sender != null ? sender.getAvatarUrl() : null,
                projectId, "project", "/projects/" + projectId);
        activityService.record(senderId, projectId, ActivityType.INVITATION_SENT,
                "Invitation sent", receiver.getFullName(), null);
        return toResponse(invitation, project, sender, receiver);
    }

    @Transactional
    public InvitationResponse accept(String invitationId, String userId) {
        ProjectInvitation invitation = findInvitation(invitationId);
        if (!invitation.getReceiverId().equals(userId)) {
            throw new IllegalArgumentException("This invitation was not sent to you");
        }
        if (isExpired(invitation)) {
            invitation.setStatus(InvitationStatus.EXPIRED);
            invitationRepository.save(invitation);
            throw new IllegalArgumentException("This invitation has expired");
        }
        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new IllegalArgumentException("This invitation is no longer pending");
        }

        Project project = findActiveProject(invitation.getProjectId());
        if (!memberRepository.existsByProjectIdAndUserId(project.getId(), userId)) {
            entitlementService.assertCanAddMember(project.getId());
            memberRepository.save(ProjectMember.builder()
                    .projectId(project.getId()).userId(userId)
                    .role(ProjectMember.Role.MEMBER).build());
        }
        invitation.setStatus(InvitationStatus.ACCEPTED);
        invitationRepository.save(invitation);

        User receiver = userRepository.findById(userId).orElse(null);
        User sender = userRepository.findById(invitation.getSenderId()).orElse(null);
        notificationService.createNotification(
                invitation.getSenderId(), "PROJECT_INVITE_ACCEPTED", "Invitation accepted",
                (receiver != null ? receiver.getFullName() : "A user") + " accepted your invitation to " + project.getName(),
                userId, receiver != null ? receiver.getFullName() : "",
                receiver != null ? receiver.getAvatarUrl() : null,
                project.getId(), "project", "/projects/" + project.getId());
        activityService.record(userId, project.getId(), ActivityType.INVITATION_ACCEPTED,
                "Invitation accepted", project.getName(), null);
        return toResponse(invitation, project, sender, receiver);
    }

    @Transactional
    public void decline(String invitationId, String userId) {
        ProjectInvitation invitation = findInvitation(invitationId);
        if (!invitation.getReceiverId().equals(userId)) {
            throw new IllegalArgumentException("This invitation was not sent to you");
        }
        if (isExpired(invitation)) {
            invitation.setStatus(InvitationStatus.EXPIRED);
            invitationRepository.save(invitation);
            throw new IllegalArgumentException("This invitation has expired");
        }
        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new IllegalArgumentException("This invitation is no longer pending");
        }
        invitation.setStatus(InvitationStatus.DECLINED);
        invitationRepository.save(invitation);

        User receiver = userRepository.findById(userId).orElse(null);
        Project project = projectRepository.findById(invitation.getProjectId()).orElse(null);
        if (project != null) {
            notificationService.createNotification(
                    invitation.getSenderId(), "PROJECT_INVITE_DECLINED", "Invitation declined",
                    (receiver != null ? receiver.getFullName() : "A user") + " declined your invitation to " + project.getName(),
                    userId, receiver != null ? receiver.getFullName() : "",
                    receiver != null ? receiver.getAvatarUrl() : null,
                    project.getId(), "project", "/projects/" + project.getId());
        }
    }

    @Transactional
    public void delete(String invitationId, String userId) {
        ProjectInvitation invitation = findInvitation(invitationId);
        Project project = projectRepository.findById(invitation.getProjectId()).orElse(null);
        boolean canDelete = invitation.getSenderId().equals(userId)
                || invitation.getReceiverId().equals(userId)
                || (project != null && canManage(project, userId));
        if (!canDelete) {
            throw new IllegalArgumentException("You cannot delete this invitation");
        }
        invitationRepository.delete(invitation);
    }

    public List<InvitationResponse> listForProject(String projectId, String userId) {
        Project project = findActiveProject(projectId);
        assertCanManage(project, userId);
        List<ProjectInvitation> invitations = invitationRepository.findByProjectId(projectId);
        return toResponses(invitations, project);
    }

    public List<InvitationResponse> listMine(String userId) {
        List<ProjectInvitation> invitations = invitationRepository.findByReceiverIdOrderByCreatedAtDesc(userId);
        return invitations.stream()
                .map(inv -> toResponse(inv,
                        projectRepository.findById(inv.getProjectId()).orElse(null),
                        userRepository.findById(inv.getSenderId()).orElse(null),
                        userRepository.findById(inv.getReceiverId()).orElse(null)))
                .toList();
    }

    private List<InvitationResponse> toResponses(List<ProjectInvitation> invitations, Project project) {
        if (invitations.isEmpty()) return List.of();
        Set<String> userIds = invitations.stream()
                .flatMap(inv -> java.util.stream.Stream.of(inv.getSenderId(), inv.getReceiverId()))
                .collect(Collectors.toSet());
        Map<String, User> userMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
        return invitations.stream()
                .map(inv -> toResponse(inv, project, userMap.get(inv.getSenderId()), userMap.get(inv.getReceiverId())))
                .toList();
    }

    private InvitationResponse toResponse(ProjectInvitation invitation, Project project, User sender, User receiver) {
        InvitationStatus status = invitation.getStatus();
        if (status == InvitationStatus.PENDING && isExpired(invitation)) {
            status = InvitationStatus.EXPIRED;
        }
        return InvitationResponse.builder()
                .id(invitation.getId())
                .projectId(invitation.getProjectId())
                .projectName(project != null ? project.getName() : "")
                .senderId(invitation.getSenderId())
                .senderName(sender != null ? sender.getFullName() : "Unknown")
                .senderAvatar(sender != null ? sender.getAvatarUrl() : null)
                .receiverId(invitation.getReceiverId())
                .receiverName(receiver != null ? receiver.getFullName() : "Unknown")
                .receiverAvatar(receiver != null ? receiver.getAvatarUrl() : null)
                .status(status.name())
                .message(invitation.getMessage())
                .expiresAt(invitation.getExpiresAt())
                .createdAt(invitation.getCreatedAt())
                .build();
    }

    private ProjectInvitation findInvitation(String invitationId) {
        return invitationRepository.findById(invitationId)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation", invitationId));
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

    /**
     * Resolves the invitee by user id when provided (preferred — search results
     * are privacy-scoped and no longer carry email), otherwise falls back to the
     * legacy username-or-email lookup.
     */
    private User resolveInvitee(InviteRequest request) {
        if (request.getUserId() != null && !request.getUserId().isBlank()) {
            return userRepository.findById(request.getUserId())
                    .orElseThrow(() -> new IllegalArgumentException("No user found with that id"));
        }
        if (request.getUsernameOrEmail() == null || request.getUsernameOrEmail().isBlank()) {
            throw new IllegalArgumentException("A user id or username/email is required");
        }
        return userRepository.findByEmailOrUsername(request.getUsernameOrEmail())
                .orElseThrow(() -> new IllegalArgumentException("No user found with that username or email"));
    }

    private boolean canManage(Project project, String userId) {
        if (project.getOwnerId().equals(userId)) return true;
        return memberRepository.findByProjectIdAndUserId(project.getId(), userId)
                .filter(m -> m.getRole() == ProjectMember.Role.ADMIN)
                .isPresent();
    }

    private void assertCanManage(Project project, String userId) {
        if (!canManage(project, userId)) {
            throw new IllegalArgumentException("Only the project owner or an admin can manage invitations");
        }
    }

    private boolean isExpired(ProjectInvitation invitation) {
        return invitation.getExpiresAt() != null && invitation.getExpiresAt().isBefore(Instant.now());
    }
}
