package com.devsync.message;

import com.devsync.common.ResourceNotFoundException;
import com.devsync.message.dto.MessageResponse;
import com.devsync.message.dto.SendMessageRequest;
import com.devsync.presence.PresenceService;
import com.devsync.project.entity.Project;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.teamroom.repository.TeamRoomParticipantRepository;
import com.devsync.teamroom.repository.TeamRoomRepository;
import java.util.Map;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
public class WebSocketController {

    private final SimpMessagingTemplate messagingTemplate;
    private final MessageService messageService;
    private final PresenceService presenceService;
    private final TeamRoomRepository roomRepository;
    private final TeamRoomParticipantRepository participantRepository;
    private final ProjectRepository projectRepository;

    @MessageMapping("/chat.send")
    public void sendMessage(@Payload SendMessageRequest request, Principal principal) {
        String userId = principal.getName();
        MessageResponse response = messageService.sendMessage(request, userId);

        if (request.getRoomId() != null) {
            messagingTemplate.convertAndSend("/topic/room/" + request.getRoomId(), response);
        }

        if (request.getReceiverId() != null) {
            messagingTemplate.convertAndSendToUser(request.getReceiverId(), "/queue/messages", response);
            messagingTemplate.convertAndSendToUser(userId, "/queue/messages", response);
        }
    }

    @MessageMapping("/chat.typing")
    public void typing(@Payload TypingIndicator indicator, Principal principal) {
        String userId = principal.getName();
        indicator.setUserId(userId);

        if (indicator.getRoomId() != null) {
            // Same authorization as message sending (see MessageService.sendMessage):
            // the room must exist, the caller must be a participant, and the
            // room's project must be active. Otherwise the indicator is rejected
            // and never broadcast — a user outside a room cannot inject typing
            // events into it.
            if (!participantRepository.existsByRoomIdAndUserId(indicator.getRoomId(), userId)) {
                throw new IllegalArgumentException("You are not a participant in this room");
            }
            roomRepository.findById(indicator.getRoomId()).ifPresent(room -> {
                if (room.getProjectId() != null) {
                    projectRepository.findById(room.getProjectId()).ifPresent(project -> {
                        if (project.isDeleted()) {
                            throw new ResourceNotFoundException("Project", project.getId());
                        }
                        if (project.getStatus() == Project.ProjectStatus.ARCHIVED) {
                            throw new IllegalArgumentException("This project is archived and chat is disabled");
                        }
                    });
                }
            });
            messagingTemplate.convertAndSend("/topic/room/" + indicator.getRoomId() + "/typing", indicator);
        }
        if (indicator.getReceiverId() != null) {
            // DM typing: the recipient's private /user queue is subscription-
            // protected (only the recipient may subscribe), so the indicator can
            // only ever reach the intended participant.
            messagingTemplate.convertAndSendToUser(indicator.getReceiverId(), "/queue/typing", indicator);
        }
    }

    @MessageMapping("/presence")
    public void presence(@Payload PresenceMessage message, Principal principal) {
        String userId = principal.getName();
        presenceService.updateStatus(userId, message.getStatus());
        messagingTemplate.convertAndSend("/topic/presence",
                Map.of("userId", userId, "status", message.getStatus()));
    }

    @Data
    public static class PresenceMessage {
        private String status;
    }

    @Data
    public static class TypingIndicator {
        private String roomId;
        private String receiverId;
        private String userId;
        private boolean typing;
    }
}
