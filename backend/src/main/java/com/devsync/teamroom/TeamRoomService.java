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

    public List<TeamRoomResponse> getMyRooms(String userId) {
        return roomRepository.findRoomsByUserId(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public TeamRoomResponse createRoom(CreateRoomRequest request, String createdBy) {
        TeamRoom room = TeamRoom.builder()
                .name(request.getName()).projectId(request.getProjectId())
                .description(request.getDescription()).createdBy(createdBy)
                .build();
        room = roomRepository.save(room);
        participantRepository.save(TeamRoomParticipant.builder().roomId(room.getId()).userId(createdBy).build());
        return toResponse(room);
    }

    public TeamRoomResponse getRoom(String roomId) {
        return toResponse(roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("TeamRoom", roomId)));
    }

    @Transactional
    public TeamRoomResponse inviteToRoom(String roomId, InviteRequest request, String invitedBy) {
        roomRepository.findById(roomId).orElseThrow(() -> new ResourceNotFoundException("TeamRoom", roomId));
        if (participantRepository.existsByRoomIdAndUserId(roomId, request.getUserId()))
            throw new IllegalArgumentException("User is already a participant");
        participantRepository.save(TeamRoomParticipant.builder()
                .roomId(roomId).userId(request.getUserId()).invitedBy(invitedBy).build());
        return toResponse(roomRepository.findById(roomId).get());
    }

    public List<TeamRoomResponse.ParticipantDto> getParticipants(String roomId) {
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
                            .email(user != null ? user.getEmail() : "")
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
                .participantCount(count)
                .participants(buildParticipantDtos(room.getId()))
                .createdAt(room.getCreatedAt())
                .build();
    }
}
