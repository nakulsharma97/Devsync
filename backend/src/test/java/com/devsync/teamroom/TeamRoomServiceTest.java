package com.devsync.teamroom;

import com.devsync.teamroom.dto.CreateRoomRequest;
import com.devsync.teamroom.entity.TeamRoom;
import com.devsync.teamroom.entity.TeamRoomParticipant;
import com.devsync.teamroom.repository.TeamRoomParticipantRepository;
import com.devsync.teamroom.repository.TeamRoomRepository;
import com.devsync.project.entity.Project;
import com.devsync.project.entity.ProjectMember;
import com.devsync.project.repository.ProjectMemberRepository;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TeamRoomServiceTest {

    @Mock private TeamRoomRepository roomRepository;
    @Mock private TeamRoomParticipantRepository participantRepository;
    @Mock private UserRepository userRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private ProjectMemberRepository projectMemberRepository;

    private TeamRoomService teamRoomService;
    private Project project;
    private TeamRoom existingRoom;

    @BeforeEach
    void setUp() {
        teamRoomService = new TeamRoomService(roomRepository, participantRepository,
                userRepository, projectRepository, projectMemberRepository);
        project = Project.builder().name("Skill Swapper").ownerId("owner-1")
                .visibility(Project.ProjectVisibility.PUBLIC).build();
        project.setId("p1");
        existingRoom = TeamRoom.builder()
                .name("Skill Swapper — Team Chat").projectId("p1").createdBy("owner-1").build();
        existingRoom.setId("r1");
    }

    @Test
    void getOrCreateProjectRoom_shouldReturnExistingRoom_WithoutDuplicating() {
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(projectMemberRepository.existsByProjectIdAndUserId("p1", "user-1")).thenReturn(true);
        when(roomRepository.findFirstByProjectIdOrderByCreatedAtAsc("p1"))
                .thenReturn(Optional.of(existingRoom));
        when(participantRepository.existsByRoomIdAndUserId("r1", "user-1")).thenReturn(true);
        when(participantRepository.countByRoomId("r1")).thenReturn(1L);
        when(participantRepository.findByRoomId("r1")).thenReturn(java.util.List.of());

        var response = teamRoomService.getOrCreateProjectRoom("p1", "user-1");

        assertThat(response.getId()).isEqualTo("r1");
        // Idempotent: no new room, no duplicate participant insert.
        verify(roomRepository, never()).save(any());
        verify(participantRepository, never()).save(any());
    }

    @Test
    void getOrCreateProjectRoom_shouldCreateRoom_WhenMissing_AndAddMember() {
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(projectMemberRepository.existsByProjectIdAndUserId("p1", "user-1")).thenReturn(true);
        when(roomRepository.findFirstByProjectIdOrderByCreatedAtAsc("p1")).thenReturn(Optional.empty());
        when(roomRepository.save(any(TeamRoom.class))).thenAnswer(inv -> {
            TeamRoom r = inv.getArgument(0);
            r.setId("r-new");
            return r;
        });
        when(participantRepository.existsByRoomIdAndUserId("r-new", "user-1")).thenReturn(false);
        when(participantRepository.countByRoomId("r-new")).thenReturn(1L);
        when(participantRepository.findByRoomId("r-new")).thenReturn(java.util.List.of());

        var response = teamRoomService.getOrCreateProjectRoom("p1", "user-1");

        assertThat(response.getId()).isEqualTo("r-new");
        assertThat(response.getName()).isEqualTo("Skill Swapper — Team Chat");
        verify(roomRepository).save(any(TeamRoom.class));
        verify(participantRepository).save(any(TeamRoomParticipant.class));
    }

    @Test
    void getOrCreateProjectRoom_shouldReject_WhenNotProjectMember() {
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(projectMemberRepository.existsByProjectIdAndUserId("p1", "intruder")).thenReturn(false);

        assertThatThrownBy(() -> teamRoomService.getOrCreateProjectRoom("p1", "intruder"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Only project members");
        verify(roomRepository, never()).save(any());
        verify(participantRepository, never()).save(any());
    }

    @Test
    void addProjectMemberToRoom_shouldCreateRoomAndAddParticipant_WhenMissing() {
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(roomRepository.findFirstByProjectIdOrderByCreatedAtAsc("p1")).thenReturn(Optional.empty());
        when(roomRepository.save(any(TeamRoom.class))).thenAnswer(inv -> {
            TeamRoom r = inv.getArgument(0);
            r.setId("r-new");
            return r;
        });
        when(participantRepository.existsByRoomIdAndUserId("r-new", "member-1")).thenReturn(false);

        teamRoomService.addProjectMemberToRoom("p1", "member-1");

        verify(roomRepository).save(any(TeamRoom.class));
        verify(participantRepository).save(any(TeamRoomParticipant.class));
    }

    @Test
    void addProjectMemberToRoom_shouldBeIdempotent_WhenAlreadyParticipant() {
        when(roomRepository.findFirstByProjectIdOrderByCreatedAtAsc("p1"))
                .thenReturn(Optional.of(existingRoom));
        when(participantRepository.existsByRoomIdAndUserId("r1", "member-1")).thenReturn(true);

        teamRoomService.addProjectMemberToRoom("p1", "member-1");

        verify(participantRepository, never()).save(any());
    }

    @Test
    void removeProjectMemberFromRoom_shouldRemoveParticipant_WhenRoomExists() {
        when(roomRepository.findFirstByProjectIdOrderByCreatedAtAsc("p1"))
                .thenReturn(Optional.of(existingRoom));
        TeamRoomParticipant participant = TeamRoomParticipant.builder()
                .roomId("r1").userId("member-1").build();
        when(participantRepository.findByRoomIdAndUserId("r1", "member-1"))
                .thenReturn(Optional.of(participant));

        teamRoomService.removeProjectMemberFromRoom("p1", "member-1");

        verify(participantRepository).delete(participant);
    }

    @Test
    void removeProjectMemberFromRoom_shouldDoNothing_WhenNoRoom() {
        when(roomRepository.findFirstByProjectIdOrderByCreatedAtAsc("p1")).thenReturn(Optional.empty());

        teamRoomService.removeProjectMemberFromRoom("p1", "member-1");

        verify(participantRepository, never()).delete(any());
        verify(participantRepository, never()).save(any());
    }

    @Test
    void createRoom_shouldReject_WhenProjectAlreadyHasTeamChat() {
        CreateRoomRequest request = new CreateRoomRequest();
        request.setName("Second Chat");
        request.setProjectId("p1");
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(projectMemberRepository.existsByProjectIdAndUserId("p1", "owner-1")).thenReturn(true);
        when(roomRepository.findFirstByProjectIdOrderByCreatedAtAsc("p1"))
                .thenReturn(Optional.of(existingRoom));

        assertThatThrownBy(() -> teamRoomService.createRoom(request, "owner-1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already exists");
        verify(roomRepository, never()).save(any());
    }

    @Test
    void joinRoom_shouldReject_WhenNotProjectMember() {
        when(roomRepository.findById("r1")).thenReturn(Optional.of(existingRoom));
        when(participantRepository.existsByRoomIdAndUserId("r1", "intruder")).thenReturn(false);
        when(projectMemberRepository.existsByProjectIdAndUserId("p1", "intruder")).thenReturn(false);

        assertThatThrownBy(() -> teamRoomService.joinRoom("r1", "intruder"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Only project members");
        verify(participantRepository, never()).save(any());
    }
}
