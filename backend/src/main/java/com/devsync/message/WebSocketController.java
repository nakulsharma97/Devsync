package com.devsync.message;

import com.devsync.message.dto.MessageResponse;
import com.devsync.message.dto.SendMessageRequest;
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

    @MessageMapping("/chat.send")
    public void sendMessage(@Payload SendMessageRequest request, Authentication auth) {
        String userId = auth.getName();
        MessageResponse response = messageService.sendMessage(request, userId);

        if (request.getRoomId() != null) {
            // Send to room topic
            messagingTemplate.convertAndSend("/topic/room/" + request.getRoomId(), response);
        }

        if (request.getReceiverId() != null) {
            // Send to specific user
            messagingTemplate.convertAndSendToUser(request.getReceiverId(), "/queue/messages", response);
            // Also send back to sender
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

    public record TypingIndicator(String roomId, String receiverId, String userId, boolean typing) {}
}
