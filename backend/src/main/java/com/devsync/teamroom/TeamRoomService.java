package com.devsync.teamroom;

import com.devsync.common.ResourceNotFoundException;
import com.devsync.project.entity.Project;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.teamroom.dto.CreateRoomRequest;
import com.devsync.teamroom.dto.InviteRequest;
import com.devsync.teamroom.dto.TeamRoomResponse;
import com.devsync.teamroom.entity.TeamRoom;
import com.devsync.teamroom.entity.TeamRoomParticipant;
import com.devsync.teamroom.repository.TeamRoomParticipantRepository;
import com.devsync.teamroom.repository.TeamRoomRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

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
                .name(request.getName())
                .projectId(request.getProjectId())
                .description(request.getDescription())
                .createdBy(createdBy)
                .build();
        room = roomRepository.save(room);

        TeamRoomParticipant creator = TeamRoomParticipant.builder()
                .roomId(room.getId())
                .userId(createdBy)
                .build();
        participantRepository.save(creator);

        return toResponse(room);
    }

    public TeamRoomResponse getRoom(String roomId) {
        TeamRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("TeamRoom", roomId));
        return toResponse(room);
    }

    @Transactional
    public TeamRoomResponse inviteToRoom(String roomId, InviteRequest request, String invitedBy) {
        TeamRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("TeamRoom", roomId));

        if (participantRepository.existsByRoomIdAndUserId(roomId, request.getUserId())) {
            throw new IllegalArgumentException("User is already a participant");
        }

        TeamRoomParticipant participant = TeamRoomParticipant.builder()
                .roomId(roomId)
                .userId(request.getUserId())
                .invitedBy(invitedBy)
                .build();
        participantRepository.save(participant);

        return toResponse(room);
    }

    public List<TeamRoomResponse.ParticipantDto> getParticipants(String roomId) {
        return participantRepository.findByRoomId(roomId).stream()
                .map(p -> {
                    User user = userRepository.findById(p.getUserId()).orElse(null);
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
            projectRepository.findById(room.getProjectId())
                    .ifPresent(p -> projectName = p.getName());
        }

        List<TeamRoomResponse.ParticipantDto> participants = participantRepository.findByRoomId(room.getId()).stream()
                .map(p -> {
                    User user = userRepository.findById(p.getUserId()).orElse(null);
                    return TeamRoomResponse.ParticipantDto.builder()
                            .userId(p.getUserId())
                            .fullName(user != null ? user.getFullName() : "Unknown")
                            .email(user != null ? user.getEmail() : "")
                            .avatarUrl(user != null ? user.getAvatarUrl() : null)
                            .invitedBy(p.getInvitedBy())
                            .build();
                })
                .toList();

        return TeamRoomResponse.builder()
                .id(room.getId())
                .name(room.getName())
                .projectId(room.getProjectId())
                .projectName(projectName)
                .description(room.getDescription())
                .createdBy(room.getCreatedBy())
                .participantCount(count)
                .participants(participants)
                .createdAt(room.getCreatedAt())
                .build();
    }
}
