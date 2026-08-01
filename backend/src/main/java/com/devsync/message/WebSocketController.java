package com.devsync.message;

import com.devsync.message.dto.MessageResponse;
import com.devsync.message.dto.SendMessageRequest;
import com.devsync.presence.PresenceService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class WebSocketController {

    private final SimpMessagingTemplate messagingTemplate;
    private final MessageService messageService;
    private final PresenceService presenceService;

    @MessageMapping("/chat.send")
    public void sendMessage(@Payload SendMessageRequest request, Authentication auth) {
        String userId = auth.getName();
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
    public void typing(@Payload TypingIndicator indicator, Authentication auth) {
        String userId = auth.getName();
        indicator.setUserId(userId);

        if (indicator.getRoomId() != null) {
            messagingTemplate.convertAndSend("/topic/room/" + indicator.getRoomId() + "/typing", indicator);
        }
        if (indicator.getReceiverId() != null) {
            messagingTemplate.convertAndSendToUser(indicator.getReceiverId(), "/queue/typing", indicator);
        }
    }

    @MessageMapping("/presence")
    public void presence(@Payload PresenceMessage message, Authentication auth) {
        String userId = auth.getName();
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
