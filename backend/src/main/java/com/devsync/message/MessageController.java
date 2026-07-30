package com.devsync.message;

import com.devsync.message.dto.ConversationResponse;
import com.devsync.message.dto.MessageResponse;
import com.devsync.message.dto.SendMessageRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @GetMapping("/conversations")
    public ResponseEntity<List<ConversationResponse>> getConversations(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(messageService.getConversations(userDetails.getUsername()));
    }

    @GetMapping("/room/{roomId}")
    public ResponseEntity<List<MessageResponse>> getRoomMessages(
            @PathVariable String roomId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(messageService.getRoomMessages(roomId, userDetails.getUsername()));
    }

    @GetMapping("/dm/{otherUserId}")
    public ResponseEntity<List<MessageResponse>> getConversation(
            @PathVariable String otherUserId,
            @RequestParam(defaultValue = "100") int limit,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(messageService.getConversation(userDetails.getUsername(), otherUserId, limit));
    }

    @PostMapping
    public ResponseEntity<MessageResponse> sendMessage(
            @Valid @RequestBody SendMessageRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(messageService.sendMessage(request, userDetails.getUsername()));
    }
}
