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

    /**
     * Total unread messages across all of the caller's conversations (DMs +
     * team rooms). Drives the Messages nav/header badge.
     */
    @GetMapping("/unread-count")
    public ResponseEntity<java.util.Map<String, Long>> getUnreadCount(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(java.util.Map.of(
                "unreadCount", messageService.getTotalUnreadCount(userDetails.getUsername())));
    }

    @GetMapping("/room/{roomId}")
    public ResponseEntity<List<MessageResponse>> getRoomMessages(
            @PathVariable String roomId,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "100") int limit,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(messageService.getRoomMessages(
                roomId, userDetails.getUsername(), cursor, limit));
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

    /**
     * Mark a direct conversation as read — all messages from {@code otherUserId}
     * to the caller become READ. Returns the remaining unread count.
     */
    @PutMapping("/{messageId}")
    public ResponseEntity<MessageResponse> editMessage(
            @PathVariable String messageId,
            @RequestBody java.util.Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(messageService.editMessage(messageId, userDetails.getUsername(), body.get("content")));
    }

    /** Soft-deletes a message (sender-only; history is preserved). */
    @DeleteMapping("/{messageId}")
    public ResponseEntity<Void> deleteMessage(
            @PathVariable String messageId,
            @AuthenticationPrincipal UserDetails userDetails) {
        messageService.deleteMessage(messageId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    /** Toggle the caller's reaction on a message. Returns the updated reaction state. */
    @PostMapping("/{messageId}/reactions")
    public ResponseEntity<java.util.List<MessageResponse.ReactionDto>> toggleReaction(
            @PathVariable String messageId,
            @RequestBody java.util.Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(messageService.toggleReaction(
                messageId, userDetails.getUsername(), body.get("emoji")));
    }

    /** Reply thread for a message (participant-only). */
    @GetMapping("/thread/{parentMessageId}")
    public ResponseEntity<java.util.List<MessageResponse>> getThread(
            @PathVariable String parentMessageId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(messageService.getThread(parentMessageId, userDetails.getUsername()));
    }

    /** Search the caller's conversations (DMs + rooms they participate in). */
    @GetMapping("/search")
    public ResponseEntity<java.util.List<MessageResponse>> search(
            @RequestParam String q,
            @RequestParam(defaultValue = "20") int limit,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(messageService.searchMessages(userDetails.getUsername(), q, limit));
    }

    @PostMapping("/dm/{otherUserId}/read")
    public ResponseEntity<java.util.Map<String, Long>> markDirectRead(
            @PathVariable String otherUserId,
            @AuthenticationPrincipal UserDetails userDetails) {
        long unread = messageService.markDirectRead(otherUserId, userDetails.getUsername());
        return ResponseEntity.ok(java.util.Map.of("unreadCount", unread));
    }

    /**
     * Mark a room as read for the caller — inserts read receipts for every
     * unread message. Returns the remaining unread count.
     */
    @PostMapping("/room/{roomId}/read")
    public ResponseEntity<java.util.Map<String, Long>> markRoomRead(
            @PathVariable String roomId,
            @AuthenticationPrincipal UserDetails userDetails) {
        long unread = messageService.markRoomRead(roomId, userDetails.getUsername());
        return ResponseEntity.ok(java.util.Map.of("unreadCount", unread));
    }
}
