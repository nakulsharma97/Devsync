package com.devsync.message;

import com.devsync.activity.ActivityService;
import com.devsync.attachment.AttachmentService;
import com.devsync.message.dto.MessageResponse;
import com.devsync.message.dto.SendMessageRequest;
import com.devsync.message.entity.Message;
import com.devsync.message.entity.MessageRead;
import com.devsync.message.entity.MessageStatus;
import com.devsync.message.repository.MessageReadRepository;
import com.devsync.message.repository.MessageReactionRepository;
import com.devsync.message.repository.MessageRepository;
import com.devsync.presence.PresenceService;
import com.devsync.project.entity.Project;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.teamroom.entity.TeamRoom;
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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MessageServiceTest {

    @Mock private MessageRepository messageRepository;
    @Mock private MessageReadRepository messageReadRepository;
    @Mock private MessageReactionRepository reactionRepository;
    @Mock private UserRepository userRepository;
    @Mock private TeamRoomRepository roomRepository;
    @Mock private TeamRoomParticipantRepository participantRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private ActivityService activityService;
    @Mock private AttachmentService attachmentService;
    @Mock private PresenceService presenceService;

    private MessageService messageService;

    @BeforeEach
    void setUp() {
        messageService = new MessageService(messageRepository, messageReadRepository, reactionRepository,
                userRepository, roomRepository, participantRepository, projectRepository, activityService,
                attachmentService, presenceService);
    }

    @Test
    void sendMessage_shouldThrow_WhenRoomProjectArchived() {
        TeamRoom room = TeamRoom.builder().projectId("p1").createdBy("owner1").build();
        room.setId("r1");
        Project project = Project.builder().name("DevSync").ownerId("owner1").build();
        project.setId("p1");
        project.setStatus(Project.ProjectStatus.ARCHIVED);

        when(participantRepository.existsByRoomIdAndUserId("r1", "u1")).thenReturn(true);
        when(roomRepository.findById("r1")).thenReturn(Optional.of(room));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));

        SendMessageRequest request = mock(SendMessageRequest.class);
        when(request.getRoomId()).thenReturn("r1");
        when(request.getContent()).thenReturn("Hello");

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

        when(participantRepository.existsByRoomIdAndUserId("r1", "u1")).thenReturn(true);
        when(roomRepository.findById("r1")).thenReturn(Optional.of(room));
        when(projectRepository.findById("p1")).thenReturn(Optional.of(project));

        SendMessageRequest request = mock(SendMessageRequest.class);
        when(request.getRoomId()).thenReturn("r1");
        when(request.getContent()).thenReturn("Hello");

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

        when(participantRepository.existsByRoomIdAndUserId("r1", "u1")).thenReturn(true);
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
    void sendMessage_shouldReject_WhenSenderNotRoomParticipant() {
        when(participantRepository.existsByRoomIdAndUserId("r1", "u1")).thenReturn(false);

        SendMessageRequest request = mock(SendMessageRequest.class);
        when(request.getRoomId()).thenReturn("r1");
        when(request.getContent()).thenReturn("Hello");

        assertThatThrownBy(() -> messageService.sendMessage(request, "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not a participant");

        // No room lookup, no project lookup, no persistence.
        verify(roomRepository, never()).findById(any());
        verify(messageRepository, never()).save(any());
    }

    @Test
    void sendMessage_shouldReject_WhenAttachmentNotOwnedBySender() {
        when(attachmentService.isUploader("att-1", "u1")).thenReturn(false);

        SendMessageRequest request = new SendMessageRequest();
        request.setReceiverId("u2");
        request.setContent("Leaky file");
        request.setAttachmentId("att-1");

        assertThatThrownBy(() -> messageService.sendMessage(request, "u1"))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class)
                .hasMessageContaining("does not belong");

        verify(messageRepository, never()).save(any());
    }

    @Test
    void sendMessage_shouldAllow_WhenAttachmentOwnedBySender() {
        when(attachmentService.isUploader("att-1", "u1")).thenReturn(true);
        when(userRepository.findById("u2")).thenReturn(Optional.of(activeUser("u2")));
        when(messageRepository.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));

        SendMessageRequest request = mock(SendMessageRequest.class);
        when(request.getAttachmentId()).thenReturn("att-1");
        when(request.getReceiverId()).thenReturn("u2");
        when(request.getContent()).thenReturn("Here is the file");

        MessageResponse response = messageService.sendMessage(request, "u1");

        assertThat(response.getAttachmentId()).isEqualTo("att-1");
    }

    @Test
    void sendMessage_shouldAllowDirectMessages_WhenNoRoom() {
        when(userRepository.findById("u2")).thenReturn(Optional.of(activeUser("u2")));
        when(messageRepository.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));

        SendMessageRequest request = mock(SendMessageRequest.class);
        when(request.getReceiverId()).thenReturn("u2");
        when(request.getContent()).thenReturn("Hello there");

        MessageResponse response = messageService.sendMessage(request, "u1");

        assertThat(response.getContent()).isEqualTo("Hello there");
        assertThat(response.getReceiverId()).isEqualTo("u2");
        assertThat(response.getStatus()).isEqualTo("SENT");
        verify(roomRepository, never()).findById(any());
    }

    @Test
    void sendMessage_shouldReject_WhenNoTarget() {
        SendMessageRequest request = new SendMessageRequest();
        request.setContent("Nowhere");

        assertThatThrownBy(() -> messageService.sendMessage(request, "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("either a room or a direct recipient");
        verify(messageRepository, never()).save(any());
    }

    @Test
    void sendMessage_shouldReject_WhenBothRoomAndReceiver() {
        SendMessageRequest request = new SendMessageRequest();
        request.setRoomId("r1");
        request.setReceiverId("u2");
        request.setContent("Both");

        assertThatThrownBy(() -> messageService.sendMessage(request, "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("either a room or a direct recipient");
        verify(messageRepository, never()).save(any());
    }

    @Test
    void sendMessage_shouldReject_WhenMessagingYourself() {
        SendMessageRequest request = new SendMessageRequest();
        request.setReceiverId("u1");
        request.setContent("Self note");

        assertThatThrownBy(() -> messageService.sendMessage(request, "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("yourself");
        verify(messageRepository, never()).save(any());
    }

    @Test
    void sendMessage_shouldReject_WhenContentIsNullOrBlank() {
        SendMessageRequest request = new SendMessageRequest();
        request.setReceiverId("u2");
        request.setContent(null);

        assertThatThrownBy(() -> messageService.sendMessage(request, "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Message content is required");
        verify(messageRepository, never()).save(any());

        // Blank content should also be rejected
        SendMessageRequest blankRequest = new SendMessageRequest();
        blankRequest.setReceiverId("u2");
        blankRequest.setContent("   ");

        assertThatThrownBy(() -> messageService.sendMessage(blankRequest, "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Message content is required");
        verify(messageRepository, never()).save(any());
    }

    @Test
    void sendMessage_shouldReject_WhenRecipientDoesNotExist() {
        when(userRepository.findById("ghost")).thenReturn(Optional.empty());

        SendMessageRequest request = new SendMessageRequest();
        request.setReceiverId("ghost");
        request.setContent("Hello");

        assertThatThrownBy(() -> messageService.sendMessage(request, "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Recipient not found");
        verify(messageRepository, never()).save(any());
    }

    @Test
    void sendMessage_shouldReject_WhenRecipientDeleted() {
        User deleted = activeUser("u2");
        deleted.setDeleted(true);
        when(userRepository.findById("u2")).thenReturn(Optional.of(deleted));

        SendMessageRequest request = new SendMessageRequest();
        request.setReceiverId("u2");
        request.setContent("Hello");

        assertThatThrownBy(() -> messageService.sendMessage(request, "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("no longer available");
        verify(messageRepository, never()).save(any());
    }

    @Test
    void sendMessage_shouldReject_WhenRecipientBlocked() {
        User blocked = activeUser("u2");
        blocked.setBlocked(true);
        when(userRepository.findById("u2")).thenReturn(Optional.of(blocked));

        SendMessageRequest request = new SendMessageRequest();
        request.setReceiverId("u2");
        request.setContent("Hello");

        assertThatThrownBy(() -> messageService.sendMessage(request, "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("blocked");
        verify(messageRepository, never()).save(any());
    }

    @Test
    void markDirectRead_shouldReject_SelfConversation() {
        assertThatThrownBy(() -> messageService.markDirectRead("u1", "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid conversation");
        verify(messageRepository, never()).markDirectRead(any(), any(), any(), any());
    }

    @Test
    void markDirectRead_shouldMarkInbound_andReturnRemainingUnread() {
        when(messageRepository.markDirectRead(eq("u2"), eq("u1"), eq(MessageStatus.READ), any()))
                .thenReturn(1);
        when(messageRepository.countBySenderIdAndReceiverIdAndStatusNotAndHiddenFalse(
                "u2", "u1", MessageStatus.READ)).thenReturn(0L);

        long unread = messageService.markDirectRead("u2", "u1");

        assertThat(unread).isZero();
        verify(messageRepository).markDirectRead(eq("u2"), eq("u1"), eq(MessageStatus.READ), any());
    }

    @Test
    void markRoomRead_shouldReject_WhenNotParticipant() {
        when(participantRepository.existsByRoomIdAndUserId("r1", "u1")).thenReturn(false);

        assertThatThrownBy(() -> messageService.markRoomRead("r1", "u1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not a participant");
        verify(messageReadRepository, never()).saveAll(any());
    }

    @Test
    void markRoomRead_shouldInsertReceipts_forUnreadMessages() {
        when(participantRepository.existsByRoomIdAndUserId("r1", "u1")).thenReturn(true);
        when(messageReadRepository.findUnreadMessageIdsByRoom("r1", "u1"))
                .thenReturn(java.util.List.of("m1", "m2"));
        when(messageReadRepository.countUnreadByRoom("r1", "u1")).thenReturn(0L);

        long unread = messageService.markRoomRead("r1", "u1");

        assertThat(unread).isZero();
        verify(messageReadRepository).saveAll(argThat(iterable -> {
            java.util.List<?> list = iterable instanceof java.util.List<?> l ? l : java.util.List.of();
            return list.size() == 2 && ((MessageRead) list.get(0)).getUserId().equals("u1");
        }));
    }

    private User activeUser(String id) {
        User user = User.builder().email(id + "@test.dev").fullName("User " + id).build();
        user.setId(id);
        return user;
    }
}
