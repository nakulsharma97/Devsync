package com.devsync.message;

import com.devsync.common.ResourceNotFoundException;
import com.devsync.message.dto.ConversationResponse;
import com.devsync.message.dto.MessageResponse;
import com.devsync.message.dto.SendMessageRequest;
import com.devsync.message.entity.Message;
import com.devsync.message.repository.MessageRepository;
import com.devsync.teamroom.entity.TeamRoom;
import com.devsync.teamroom.entity.TeamRoomParticipant;
import com.devsync.teamroom.repository.TeamRoomParticipantRepository;
import com.devsync.teamroom.repository.TeamRoomRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final TeamRoomRepository roomRepository;
    private final TeamRoomParticipantRepository participantRepository;

    @Transactional
    public MessageResponse sendMessage(SendMessageRequest request, String senderId) {
        Message message = Message.builder()
                .senderId(senderId)
                .roomId(request.getRoomId())
                .receiverId(request.getReceiverId())
                .content(request.getContent())
                .messageType(request.getMessageType() != null ? request.getMessageType() : "text")
                .systemMessage(request.isSystemMessage())
                .build();
        message = messageRepository.save(message);
        return toResponse(message);
    }

    public List<MessageResponse> getRoomMessages(String roomId, int limit) {
        return messageRepository.findByRoomIdOrderByCreatedAtAsc(roomId, PageRequest.of(0, limit)).stream()
                .map(this::toResponse)
                .toList();
    }

    public List<MessageResponse> getConversation(String userId, String otherId, int limit) {
        return messageRepository.findConversation(userId, otherId, PageRequest.of(0, limit)).stream()
                .map(this::toResponse)
                .toList();
    }

    public List<ConversationResponse> getConversations(String userId) {
        List<ConversationResponse> conversations = new ArrayList<>();

        // Get all team rooms the user is part of
        List<TeamRoom> rooms = roomRepository.findRoomsByUserId(userId);
        for (TeamRoom room : rooms) {
            List<Message> msgs = messageRepository.findByRoomIdOrderByCreatedAtAsc(room.getId());
            Message lastMsg = msgs.isEmpty() ? null : msgs.get(msgs.size() - 1);
            long count = participantRepository.countByRoomId(room.getId());

            conversations.add(ConversationResponse.builder()
                    .id("room_" + room.getId())
                    .type("room")
                    .name(room.getName())
                    .roomId(room.getId())
                    .lastMessage(lastMsg != null ? lastMsg.getContent() : null)
                    .lastMessageAt(lastMsg != null ? lastMsg.getCreatedAt() : room.getCreatedAt())
                    .participantCount((int) count)
                    .build());
        }

        // Get all unique DM partners
        List<Message> sentDMs = messageRepository.findReceivedDMs(userId);
        Set<String> dmPartners = new HashSet<>();
        dmPartners.addAll(messageRepository.findConversation(userId, "", PageRequest.of(0, 1000)).stream()
                .filter(m -> m.getRoomId() == null)
                .map(m -> m.getSenderId().equals(userId) ? m.getReceiverId() : m.getSenderId())
                .collect(Collectors.toSet()));

        // Actually, get DM partners more efficiently
        List<Message> allRelatedMessages = new ArrayList<>();
        for (String roomId : messageRepository.findDistinctRoomIds()) {
            allRelatedMessages.addAll(messageRepository.findByRoomIdOrderByCreatedAtAsc(roomId, PageRequest.of(0, 1)));
        }

        for (String partnerId : dmPartners) {
            if (partnerId == null || partnerId.equals(userId)) continue;
            Optional<User> partnerOpt = userRepository.findById(partnerId);
            if (partnerOpt.isEmpty()) continue;
            User partner = partnerOpt.get();

            List<Message> dmMsgs = messageRepository.findConversation(userId, partnerId, PageRequest.of(0, 1));
            Message lastMsg = dmMsgs.isEmpty() ? null : dmMsgs.get(0);

            conversations.add(ConversationResponse.builder()
                    .id("dm_" + partnerId)
                    .type("direct")
                    .name(partner.getFullName())
                    .otherUserId(partnerId)
                    .otherUserName(partner.getFullName())
                    .avatarUrl(partner.getAvatarUrl())
                    .lastMessage(lastMsg != null ? lastMsg.getContent() : null)
                    .lastMessageAt(lastMsg != null ? lastMsg.getCreatedAt() : partner.getCreatedAt())
                    .participantCount(2)
                    .build());
        }

        conversations.sort((a, b) -> {
            if (a.getLastMessageAt() == null && b.getLastMessageAt() == null) return 0;
            if (a.getLastMessageAt() == null) return 1;
            if (b.getLastMessageAt() == null) return -1;
            return b.getLastMessageAt().compareTo(a.getLastMessageAt());
        });

        return conversations;
    }

    private MessageResponse toResponse(Message message) {
        User sender = userRepository.findById(message.getSenderId()).orElse(null);
        return MessageResponse.builder()
                .id(message.getId())
                .senderId(message.getSenderId())
                .senderName(sender != null ? sender.getFullName() : "Unknown")
                .senderAvatar(sender != null ? sender.getAvatarUrl() : null)
                .roomId(message.getRoomId())
                .receiverId(message.getReceiverId())
                .content(message.getContent())
                .messageType(message.getMessageType())
                .systemMessage(message.isSystemMessage())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
