package com.devsync.teamroom;

import com.devsync.common.ResourceNotFoundException;
import com.devsync.project.entity.Project;
import com.devsync.project.repository.ProjectMemberRepository;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.teamroom.entity.TeamRoom;
import com.devsync.teamroom.entity.TeamRoomParticipant;
import com.devsync.teamroom.repository.TeamRoomParticipantRepository;
import com.devsync.teamroom.repository.TeamRoomRepository;
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
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TeamRoomServiceAuthTest {

    @Mock private TeamRoomRepository roomRepository;
    @Mock private TeamRoomParticipantRepository participantRepository;
    @Mock private UserRepository userRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private ProjectMemberRepository projectMemberRepository;

    private TeamRoomService roomService;
    private TeamRoom room;

    @BeforeEach
    void setUp() {
        roomService = new TeamRoomService(roomRepository, participantRepository, userRepository,
                projectRepository, projectMemberRepository);

        room = new TeamRoom();
        room.setId("room-1");
        room.setName("Engineering");
        room.setCreatedBy("creator-1");
    }

    // ── getRoom auth tests ───────────────────────────────────

    @Test
    void getRoom_shouldSucceed_WhenParticipant() {
        when(roomRepository.findById("room-1")).thenReturn(Optional.of(room));
        when(participantRepository.existsByRoomIdAndUserId("room-1", "participant-1"))
                .thenReturn(true);

        var response = roomService.getRoom("room-1", "participant-1");

        assertThat(response.getId()).isEqualTo("room-1");
        assertThat(response.getName()).isEqualTo("Engineering");
    }

    @Test
    void getRoom_shouldThrow_WhenNotParticipant() {
        when(roomRepository.findById("room-1")).thenReturn(Optional.of(room));
        when(participantRepository.existsByRoomIdAndUserId("room-1", "stranger"))
                .thenReturn(false);

        assertThatThrownBy(() -> roomService.getRoom("room-1", "stranger"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not a participant");
    }

    @Test
    void getRoom_shouldThrow_WhenRoomNotFound() {
        when(roomRepository.findById("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> roomService.getRoom("ghost", "user-1"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ── createRoom auth tests ────────────────────────────────

    @Test
    void createRoom_shouldSucceed_WhenCreatorIsProjectMember() {
        com.devsync.teamroom.dto.CreateRoomRequest request =
                new com.devsync.teamroom.dto.CreateRoomRequest();
        request.setName("Project Chat");
        request.setProjectId("project-1");

        when(projectRepository.findById("project-1"))
                .thenReturn(Optional.of(withId(Project.builder().name("P").ownerId("creator-1").build(), "project-1")));
        when(projectMemberRepository.existsByProjectIdAndUserId("project-1", "creator-1")).thenReturn(true);
        when(roomRepository.save(any(TeamRoom.class))).thenAnswer(inv -> {
            TeamRoom r = inv.getArgument(0);
            r.setId("new-room-1");
            return r;
        });
        when(participantRepository.countByRoomId(anyString())).thenReturn(1L);
        when(participantRepository.findByRoomId(anyString())).thenReturn(java.util.List.of());

        var response = roomService.createRoom(request, "creator-1");

        assertThat(response.getProjectId()).isEqualTo("project-1");
        assertThat(response.getName()).isEqualTo("Project Chat");
    }

    @Test
    void createRoom_shouldThrow_WhenCreatorIsNotProjectMember() {
        com.devsync.teamroom.dto.CreateRoomRequest request =
                new com.devsync.teamroom.dto.CreateRoomRequest();
        request.setName("Sneaky Chat");
        request.setProjectId("project-1");

        when(projectRepository.findById("project-1"))
                .thenReturn(Optional.of(withId(Project.builder().name("P").ownerId("owner-1").build(), "project-1")));
        when(projectMemberRepository.existsByProjectIdAndUserId("project-1", "stranger")).thenReturn(false);

        assertThatThrownBy(() -> roomService.createRoom(request, "stranger"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Only project members");
        verify(roomRepository, never()).save(any());
    }

    @Test
    void createRoom_shouldThrow_WhenProjectMissing() {
        com.devsync.teamroom.dto.CreateRoomRequest request =
                new com.devsync.teamroom.dto.CreateRoomRequest();
        request.setName("Ghost Chat");
        request.setProjectId("ghost");

        when(projectRepository.findById("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> roomService.createRoom(request, "user-1"))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(roomRepository, never()).save(any());
    }

    // ── inviteToRoom auth tests ──────────────────────────────

    @Test
    void inviteToRoom_shouldThrow_WhenInviterIsNotParticipant() {
        room.setProjectId("project-1");
        when(roomRepository.findById("room-1")).thenReturn(Optional.of(room));
        when(participantRepository.existsByRoomIdAndUserId("room-1", "stranger")).thenReturn(false);

        com.devsync.teamroom.dto.InviteRequest invite = new com.devsync.teamroom.dto.InviteRequest();
        invite.setUserId("target-1");

        assertThatThrownBy(() -> roomService.inviteToRoom("room-1", invite, "stranger"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Only participants");
        verify(participantRepository, never()).save(any());
    }

    @Test
    void inviteToRoom_shouldThrow_WhenTargetNotProjectMember() {
        room.setProjectId("project-1");
        when(roomRepository.findById("room-1")).thenReturn(Optional.of(room));
        when(participantRepository.existsByRoomIdAndUserId("room-1", "participant-1")).thenReturn(true);
        when(projectMemberRepository.existsByProjectIdAndUserId("project-1", "outsider")).thenReturn(false);

        com.devsync.teamroom.dto.InviteRequest invite = new com.devsync.teamroom.dto.InviteRequest();
        invite.setUserId("outsider");

        assertThatThrownBy(() -> roomService.inviteToRoom("room-1", invite, "participant-1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not a member of this project");
        verify(participantRepository, never()).save(any());
    }

    @Test
    void inviteToRoom_shouldSucceed_WhenInviterParticipantAndTargetProjectMember() {
        room.setProjectId("project-1");
        when(roomRepository.findById("room-1")).thenReturn(Optional.of(room));
        when(participantRepository.existsByRoomIdAndUserId("room-1", "participant-1")).thenReturn(true);
        when(participantRepository.existsByRoomIdAndUserId("room-1", "member-2")).thenReturn(false);
        when(projectMemberRepository.existsByProjectIdAndUserId("project-1", "member-2")).thenReturn(true);
        when(participantRepository.countByRoomId("room-1")).thenReturn(2L);
        when(participantRepository.findByRoomId("room-1")).thenReturn(java.util.List.of());

        com.devsync.teamroom.dto.InviteRequest invite = new com.devsync.teamroom.dto.InviteRequest();
        invite.setUserId("member-2");

        var response = roomService.inviteToRoom("room-1", invite, "participant-1");

        assertThat(response.getId()).isEqualTo("room-1");
        verify(participantRepository).save(any(TeamRoomParticipant.class));
    }

    private static Project withId(Project project, String id) {
        project.setId(id);
        return project;
    }

    // ── getOrCreateProjectRoom + joinRoom ────────────────────

    @Test
    void getOrCreateProjectRoom_shouldCreateRoom_WhenNoneExists() {
        com.devsync.teamroom.dto.CreateRoomRequest request = new com.devsync.teamroom.dto.CreateRoomRequest();
        when(projectRepository.findById("project-1"))
                .thenReturn(Optional.of(withId(Project.builder().name("P").ownerId("owner-1").build(), "project-1")));
        when(projectMemberRepository.existsByProjectIdAndUserId("project-1", "member-1")).thenReturn(true);
        when(roomRepository.findFirstByProjectIdOrderByCreatedAtAsc("project-1")).thenReturn(Optional.empty());
        when(roomRepository.save(any(TeamRoom.class))).thenAnswer(inv -> {
            TeamRoom r = inv.getArgument(0);
            r.setId("new-room");
            return r;
        });
        when(participantRepository.countByRoomId("new-room")).thenReturn(1L);
        when(participantRepository.findByRoomId(anyString())).thenReturn(java.util.List.of());

        var response = roomService.getOrCreateProjectRoom("project-1", "member-1");

        assertThat(response.getId()).isEqualTo("new-room");
        assertThat(response.getProjectId()).isEqualTo("project-1");
        verify(roomRepository).save(any(TeamRoom.class));
    }

    @Test
    void getOrCreateProjectRoom_shouldReturnExistingRoom_WithoutDuplicating() {
        TeamRoom existing = new TeamRoom();
        existing.setId("existing-room");
        existing.setProjectId("project-1");
        existing.setName("P Chat");
        when(projectRepository.findById("project-1"))
                .thenReturn(Optional.of(withId(Project.builder().name("P").ownerId("owner-1").build(), "project-1")));
        when(projectMemberRepository.existsByProjectIdAndUserId("project-1", "member-1")).thenReturn(true);
        when(roomRepository.findFirstByProjectIdOrderByCreatedAtAsc("project-1"))
                .thenReturn(Optional.of(existing));
        when(participantRepository.existsByRoomIdAndUserId("existing-room", "member-1")).thenReturn(true);
        when(participantRepository.countByRoomId("existing-room")).thenReturn(2L);
        when(participantRepository.findByRoomId(anyString())).thenReturn(java.util.List.of());

        var response = roomService.getOrCreateProjectRoom("project-1", "member-1");

        assertThat(response.getId()).isEqualTo("existing-room");
        verify(roomRepository, never()).save(any(TeamRoom.class));
        verify(participantRepository, never()).save(any(TeamRoomParticipant.class));
    }

    @Test
    void getOrCreateProjectRoom_shouldAddMemberToExistingRoom() {
        TeamRoom existing = new TeamRoom();
        existing.setId("existing-room");
        existing.setProjectId("project-1");
        existing.setName("P Chat");
        when(projectRepository.findById("project-1"))
                .thenReturn(Optional.of(withId(Project.builder().name("P").ownerId("owner-1").build(), "project-1")));
        when(projectMemberRepository.existsByProjectIdAndUserId("project-1", "member-2")).thenReturn(true);
        when(roomRepository.findFirstByProjectIdOrderByCreatedAtAsc("project-1"))
                .thenReturn(Optional.of(existing));
        when(participantRepository.existsByRoomIdAndUserId("existing-room", "member-2")).thenReturn(false);
        when(participantRepository.countByRoomId("existing-room")).thenReturn(2L);
        when(participantRepository.findByRoomId(anyString())).thenReturn(java.util.List.of());

        var response = roomService.getOrCreateProjectRoom("project-1", "member-2");

        assertThat(response.getId()).isEqualTo("existing-room");
        verify(participantRepository).save(any(TeamRoomParticipant.class));
    }

    @Test
    void getOrCreateProjectRoom_shouldThrow_WhenNotProjectMember() {
        when(projectRepository.findById("project-1"))
                .thenReturn(Optional.of(withId(Project.builder().name("P").ownerId("owner-1").build(), "project-1")));
        when(projectMemberRepository.existsByProjectIdAndUserId("project-1", "stranger")).thenReturn(false);

        assertThatThrownBy(() -> roomService.getOrCreateProjectRoom("project-1", "stranger"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Only project members");
        verify(roomRepository, never()).save(any(TeamRoom.class));
    }

    @Test
    void joinRoom_shouldThrow_WhenNonMemberTriesToJoinProjectRoom() {
        room.setProjectId("project-1");
        when(roomRepository.findById("room-1")).thenReturn(Optional.of(room));
        when(participantRepository.existsByRoomIdAndUserId("room-1", "stranger")).thenReturn(false);
        when(projectMemberRepository.existsByProjectIdAndUserId("project-1", "stranger")).thenReturn(false);

        assertThatThrownBy(() -> roomService.joinRoom("room-1", "stranger"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Only project members");
        verify(participantRepository, never()).save(any());
    }

    // ── getParticipants auth tests ───────────────────────────

    @Test
    void getParticipants_shouldSucceed_WhenParticipant() {
        when(participantRepository.existsByRoomIdAndUserId("room-1", "participant-1"))
                .thenReturn(true);

        // No participants besides the empty case is fine for auth test
        var participants = roomService.getParticipants("room-1", "participant-1");

        assertThat(participants).isNotNull();
    }

    @Test
    void getParticipants_shouldThrow_WhenNotParticipant() {
        when(participantRepository.existsByRoomIdAndUserId("room-1", "stranger"))
                .thenReturn(false);

        assertThatThrownBy(() -> roomService.getParticipants("room-1", "stranger"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not a participant");
    }
}
