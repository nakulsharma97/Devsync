package com.devsync.teamroom;

import com.devsync.common.ResourceNotFoundException;
import com.devsync.teamroom.entity.TeamRoom;
import com.devsync.teamroom.repository.TeamRoomParticipantRepository;
import com.devsync.teamroom.repository.TeamRoomRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import com.devsync.project.repository.ProjectRepository;
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

    private TeamRoomService roomService;
    private TeamRoom room;

    @BeforeEach
    void setUp() {
        roomService = new TeamRoomService(roomRepository, participantRepository, userRepository, projectRepository);

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
