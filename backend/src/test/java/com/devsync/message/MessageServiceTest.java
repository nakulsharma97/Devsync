package com.devsync.message;

import com.devsync.message.dto.MessageResponse;
import com.devsync.message.dto.SendMessageRequest;
import com.devsync.message.entity.Message;
import com.devsync.message.repository.MessageRepository;
import com.devsync.project.entity.Project;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.teamroom.entity.TeamRoom;
import com.devsync.teamroom.repository.TeamRoomParticipantRepository;
import com.devsync.teamroom.repository.TeamRoomRepository;
import com.devsync.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MessageServiceTest {

    @Mock private MessageRepository messageRepository;
    @Mock private UserRepository userRepository;
    @Mock private TeamRoomRepository roomRepository;
    @Mock private TeamRoomParticipantRepository participantRepository;
    @Mock private ProjectRepository projectRepository;

    private MessageService messageService;

    @BeforeEach
    void setUp() {
        messageService = new MessageService(messageRepository, userRepository, roomRepository,
                participantRepository, projectRepository);
    }

    @Test
    void sendMessage_shouldThrow_WhenRoomProjectArchived() {
        TeamRoom room = TeamRoom.builder().projectId("p1").createdBy("owner1").build();
        room.setId("r1");
        Project project = Project.builder().name("DevSync").ownerId("owner1").build();
        project.setId("p1");
        project.setStatus(Project.ProjectStatus.ARCHIVED);

        when(roomRepository.findById("r1")).thenReturn(Optional.of(room));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));

        SendMessageRequest request = mock(SendMessageRequest.class);
        when(request.getRoomId()).thenReturn("r1");

        assertThatThrownBy(() -> messageService.sendMessage(request, "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("archived");

        verify(messageRepository, never()).save(any());
    }

    @Test
    void sendMessage_shouldThrow_WhenRoomProjectDeleted() {
        TeamRoom room = TeamRoom.builder().projectId("p1").createdBy("owner1").build();
        room.setId("r1");
        Project project = Project.builder().name("DevSync").ownerId("owner1").build();
        project.setId("p1");
        project.setDeleted(true);

        when(roomRepository.findById("r1")).thenReturn(Optional.of(room));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));

        SendMessageRequest request = mock(SendMessageRequest.class);
        when(request.getRoomId()).thenReturn("r1");

        assertThatThrownBy(() -> messageService.sendMessage(request, "u1"))
                .isInstanceOf(com.devsync.common.ResourceNotFoundException.class);

        verify(messageRepository, never()).save(any());
    }

    @Test
    void sendMessage_shouldSucceed_WhenProjectActive() {
        TeamRoom room = TeamRoom.builder().projectId("p1").createdBy("owner1").build();
        room.setId("r1");
        Project project = Project.builder().name("DevSync").ownerId("owner1").build();
        project.setId("p1");

        when(roomRepository.findById("r1")).thenReturn(Optional.of(room));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));
        when(messageRepository.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));

        SendMessageRequest request = mock(SendMessageRequest.class);
        when(request.getRoomId()).thenReturn("r1");
        when(request.getContent()).thenReturn("Hello team");

        MessageResponse response = messageService.sendMessage(request, "u1");

        assertThat(response.getContent()).isEqualTo("Hello team");
        assertThat(response.getRoomId()).isEqualTo("r1");
    }

    @Test
    void sendMessage_shouldAllowDirectMessages_WhenNoRoom() {
        when(messageRepository.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));

        SendMessageRequest request = mock(SendMessageRequest.class);
        when(request.getReceiverId()).thenReturn("u2");
        when(request.getContent()).thenReturn("Hello there");

        MessageResponse response = messageService.sendMessage(request, "u1");

        assertThat(response.getContent()).isEqualTo("Hello there");
        assertThat(response.getReceiverId()).isEqualTo("u2");
        verify(roomRepository, never()).findById(any());
    }
}
