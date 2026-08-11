package com.devsync.teamroom;

import com.devsync.common.ResourceNotFoundException;
import com.devsync.teamroom.dto.CreateRoomRequest;
import com.devsync.teamroom.dto.InviteRequest;
import com.devsync.teamroom.dto.TeamRoomResponse;
import com.devsync.teamroom.entity.TeamRoom;
import com.devsync.teamroom.entity.TeamRoomParticipant;
import com.devsync.teamroom.repository.TeamRoomParticipantRepository;
import com.devsync.teamroom.repository.TeamRoomRepository;
import com.devsync.user.entity.User;
import com.devsync.project.entity.Project;
import com.devsync.project.repository.ProjectMemberRepository;
import com.devsync.project.repository.ProjectRepository;
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
public class TeamRoomService {

    private final TeamRoomRepository roomRepository;
    private final TeamRoomParticipantRepository participantRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;

    public List<TeamRoomResponse> getMyRooms(String userId) {
        return roomRepository.findRoomsByUserId(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Creates a room. When the room is tied to a project, the creator must be a
     * member of that project — otherwise any authenticated user could open a
     * channel into a private project.
     */
    @Transactional
    public TeamRoomResponse createRoom(CreateRoomRequest request, String createdBy) {
        if (request.getProjectId() != null && !request.getProjectId().isBlank()) {
            projectRepository.findById(request.getProjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Project", request.getProjectId()));
            if (!projectMemberRepository.existsByProjectIdAndUserId(request.getProjectId(), createdBy)) {
                throw new IllegalArgumentException("Only project members can create a team chat for this project");
            }
        }
        TeamRoom room = TeamRoom.builder()
                .name(request.getName()).projectId(request.getProjectId())
                .description(request.getDescription()).createdBy(createdBy)
                .build();
        room = roomRepository.save(room);
        participantRepository.save(TeamRoomParticipant.builder().roomId(room.getId()).userId(createdBy).build());
        return toResponse(room);
    }

    public TeamRoomResponse getRoom(String roomId, String userId) {
        TeamRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("TeamRoom", roomId));
        if (!participantRepository.existsByRoomIdAndUserId(roomId, userId)) {
            throw new IllegalArgumentException("You are not a participant in this room");
        }
        return toResponse(room);
    }

    /**
     * Find-or-create the single team chat for a project (idempotent — the
     * workspace never creates duplicate rooms). The caller must be a member;
     * members are auto-added as participants.
     */
    @Transactional
    public TeamRoomResponse getOrCreateProjectRoom(String projectId, String userId) {
        projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
        if (!projectMemberRepository.existsByProjectIdAndUserId(projectId, userId)) {
            throw new IllegalArgumentException("Only project members can access the team chat");
        }
        TeamRoom room = roomRepository.findFirstByProjectIdOrderByCreatedAtAsc(projectId).orElse(null);
        if (room == null) {
            Project project = projectRepository.findById(projectId).orElseThrow();
            room = roomRepository.save(TeamRoom.builder()
                    .name(project.getName() + " Chat")
                    .projectId(projectId)
                    .description("Team chat for " + project.getName())
                    .createdBy(userId)
                    .build());
            participantRepository.save(TeamRoomParticipant.builder()
                    .roomId(room.getId()).userId(userId).invitedBy(null).build());
        } else if (!participantRepository.existsByRoomIdAndUserId(room.getId(), userId)) {
            participantRepository.save(TeamRoomParticipant.builder()
                    .roomId(room.getId()).userId(userId).invitedBy(null).build());
        }
        return toResponse(room);
    }

    /**
     * Self-join: lets a project member join their project's team chat. Project
     * rooms are only joinable by project members — never by arbitrary users.
     */
    @Transactional
    public void joinRoom(String roomId, String userId) {
        TeamRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("TeamRoom", roomId));
        if (participantRepository.existsByRoomIdAndUserId(roomId, userId)) {
            return; // idempotent
        }
        if (room.getProjectId() != null
                && !projectMemberRepository.existsByProjectIdAndUserId(room.getProjectId(), userId)) {
            throw new IllegalArgumentException("Only project members can join this room");
        }
        participantRepository.save(TeamRoomParticipant.builder()
                .roomId(roomId).userId(userId).invitedBy(null).build());
    }

    /**
     * Invites a user to a room. The inviter must already be a participant, and
     * for project rooms the invitee must be a project member — a room must never
     * become a backdoor into a private project.
     */
    @Transactional
    public TeamRoomResponse inviteToRoom(String roomId, InviteRequest request, String invitedBy) {
        TeamRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("TeamRoom", roomId));
        if (!participantRepository.existsByRoomIdAndUserId(roomId, invitedBy)) {
            throw new IllegalArgumentException("Only participants can invite others to a room");
        }
        if (participantRepository.existsByRoomIdAndUserId(roomId, request.getUserId()))
            throw new IllegalArgumentException("User is already a participant");
        if (room.getProjectId() != null
                && !projectMemberRepository.existsByProjectIdAndUserId(room.getProjectId(), request.getUserId())) {
            throw new IllegalArgumentException("User is not a member of this project");
        }
        participantRepository.save(TeamRoomParticipant.builder()
                .roomId(roomId).userId(request.getUserId()).invitedBy(invitedBy).build());
        return toResponse(room);
    }

    public List<TeamRoomResponse.ParticipantDto> getParticipants(String roomId, String userId) {
        if (!participantRepository.existsByRoomIdAndUserId(roomId, userId)) {
            throw new IllegalArgumentException("You are not a participant in this room");
        }
        return buildParticipantDtos(roomId);
    }

    private List<TeamRoomResponse.ParticipantDto> buildParticipantDtos(String roomId) {
        List<TeamRoomParticipant> participants = participantRepository.findByRoomId(roomId);
        if (participants.isEmpty()) return List.of();

        Set<String> userIds = participants.stream().map(TeamRoomParticipant::getUserId).collect(Collectors.toSet());
        Map<String, User> userMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        return participants.stream()
                .map(p -> {
                    User user = userMap.get(p.getUserId());
                    return TeamRoomResponse.ParticipantDto.builder()
                            .userId(p.getUserId())
                            .fullName(user != null ? user.getFullName() : "Unknown")
                            .avatarUrl(user != null ? user.getAvatarUrl() : null)
                            .invitedBy(p.getInvitedBy())
                            .build();
                })
                .toList();
    }

    private TeamRoomResponse toResponse(TeamRoom room) {
        long count = participantRepository.countByRoomId(room.getId());
        String projectName = null;
        if (room.getProjectId() != null) {
            projectName = projectRepository.findById(room.getProjectId())
                    .map(Project::getName).orElse(null);
        }

        return TeamRoomResponse.builder()
                .id(room.getId()).name(room.getName())
                .projectId(room.getProjectId()).projectName(projectName)
                .description(room.getDescription()).createdBy(room.getCreatedBy())
                .participantCount((int) count)
                .participants(buildParticipantDtos(room.getId()))
                .createdAt(room.getCreatedAt())
                .build();
    }
}
