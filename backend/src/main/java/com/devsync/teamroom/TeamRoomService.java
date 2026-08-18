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
import org.springframework.dao.DataIntegrityViolationException;
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
     * channel into a private project. A project may only ever have ONE team
     * chat (the V18 unique index enforces this), so creating a second one is
     * rejected with a clear message instead of surfacing a 500.
     */
    @Transactional
    public TeamRoomResponse createRoom(CreateRoomRequest request, String createdBy) {
        if (request.getProjectId() != null && !request.getProjectId().isBlank()) {
            projectRepository.findById(request.getProjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Project", request.getProjectId()));
            if (!projectMemberRepository.existsByProjectIdAndUserId(request.getProjectId(), createdBy)) {
                throw new IllegalArgumentException("Only project members can create a team chat for this project");
            }
            if (roomRepository.findFirstByProjectIdOrderByCreatedAtAsc(request.getProjectId()).isPresent()) {
                throw new IllegalArgumentException("A team chat already exists for this project");
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
     * Find-or-create the single team chat for a project (idempotent). The
     * caller must be a project member; members are auto-added as participants
     * (the workspace relies on this to heal any out-of-sync membership).
     *
     * <p>Concurrency-safe: the V18 unique index guarantees only one room per
     * project, and a {@link DataIntegrityViolationException} from a concurrent
     * create is caught and resolved by re-fetching the winning row — a racing
     * request can never produce a duplicate room.
     */
    @Transactional
    public TeamRoomResponse getOrCreateProjectRoom(String projectId, String userId) {
        return ensureProjectRoom(projectId, userId);
    }

    /**
     * Find-or-create the project's team chat and add {@code userId} as a
     * participant. Membership-sync entry point: called inside the same
     * transaction as membership creation/acceptance (project create, join
     * request approve, invitation accept, addMember) so chat membership can
     * never diverge from project membership. Idempotent.
     */
    @Transactional
    public void addProjectMemberToRoom(String projectId, String userId) {
        TeamRoom room = findOrCreateProjectRoom(projectId, userId);
        if (!participantRepository.existsByRoomIdAndUserId(room.getId(), userId)) {
            participantRepository.save(TeamRoomParticipant.builder()
                    .roomId(room.getId()).userId(userId).invitedBy(null).build());
        }
    }

    /**
     * Removes {@code userId} from the project's team chat. Called inside the
     * same transaction as member removal. Idempotent: if the project has no
     * team chat (legacy project) or the user was never a participant, nothing
     * happens.
     */
    @Transactional
    public void removeProjectMemberFromRoom(String projectId, String userId) {
        roomRepository.findFirstByProjectIdOrderByCreatedAtAsc(projectId).ifPresent(room ->
                participantRepository.findByRoomIdAndUserId(room.getId(), userId)
                        .ifPresent(participantRepository::delete));
    }

    /**
     * Core find-or-create. {@code actorId} is only used to create the room
     * (as created_by) — it is NOT required to be the target {@code userId}.
     */
    private TeamRoom findOrCreateProjectRoom(String projectId, String actorId) {
        TeamRoom room = roomRepository.findFirstByProjectIdOrderByCreatedAtAsc(projectId).orElse(null);
        if (room != null) return room;
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
        TeamRoom created = TeamRoom.builder()
                .name(project.getName() + " — Team Chat")
                .projectId(projectId)
                .description("Team chat for " + project.getName())
                .createdBy(actorId)
                .build();
        try {
            return roomRepository.save(created);
        } catch (DataIntegrityViolationException e) {
            // A concurrent request created the room first — use the winner.
            return roomRepository.findFirstByProjectIdOrderByCreatedAtAsc(projectId)
                    .orElseThrow(() -> e);
        }
    }

    /**
     * The workspace entry point: verifies project membership, then finds (or
     * creates) the project's team chat and ensures the caller is a participant.
     */
    private TeamRoomResponse ensureProjectRoom(String projectId, String userId) {
        projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
        if (!projectMemberRepository.existsByProjectIdAndUserId(projectId, userId)) {
            throw new IllegalArgumentException("Only project members can access the team chat");
        }
        TeamRoom room = findOrCreateProjectRoom(projectId, userId);
        if (!participantRepository.existsByRoomIdAndUserId(room.getId(), userId)) {
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
