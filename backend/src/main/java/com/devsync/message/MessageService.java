package com.devsync.message;

import com.devsync.common.ResourceNotFoundException;
import com.devsync.message.dto.ConversationResponse;
import com.devsync.message.dto.MessageResponse;
import com.devsync.message.dto.SendMessageRequest;
import com.devsync.message.entity.Message;
import com.devsync.message.repository.MessageRepository;
import com.devsync.project.entity.Project;
import com.devsync.project.repository.ProjectRepository;
import com.devsync.teamroom.entity.TeamRoom;
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
    private final ProjectRepository projectRepository;

    @Transactional
    public MessageResponse sendMessage(SendMessageRequest request, String senderId) {
        if (request.getRoomId() != null) {
            roomRepository.findById(request.getRoomId()).ifPresent(room -> {
                if (room.getProjectId() != null) {
                    projectRepository.findById(room.getProjectId()).ifPresent(project -> {
                        if (project.isDeleted()) {
                            throw new ResourceNotFoundException("Project", project.getId());
                        }
                        if (project.getStatus() == Project.ProjectStatus.ARCHIVED) {
                            throw new IllegalArgumentException("This project is archived and messaging is disabled");
                        }
                    });
                }
            });
        }
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

    public List<MessageResponse> getRoomMessages(String roomId, String userId) {
        if (roomId != null && !participantRepository.existsByRoomIdAndUserId(roomId, userId)) {
            throw new IllegalArgumentException("You are not a participant in this room");
        }
        List<Message> messages = messageRepository.findByRoomIdOrderByCreatedAtAsc(roomId, PageRequest.of(0, 100))
                .stream().filter(m -> !m.isHidden()).toList();
        return toResponsesWithBatchUsers(messages);
    }

    public List<MessageResponse> getConversation(String userId, String otherId, int limit) {
        List<Message> messages = messageRepository.findConversation(userId, otherId, PageRequest.of(0, limit))
                .stream().filter(m -> !m.isHidden()).toList();
        return toResponsesWithBatchUsers(messages);
    }

    public List<ConversationResponse> getConversations(String userId) {
        Set<ConversationResponse> conversationSet = new LinkedHashSet<>();

        // Get all team rooms the user is part of
        List<TeamRoom> rooms = roomRepository.findRoomsByUserId(userId);
        for (TeamRoom room : rooms) {
            List<Message> msgs = messageRepository.findByRoomIdOrderByCreatedAtAsc(room.getId(), PageRequest.of(0, 1));
            Message lastMsg = msgs.isEmpty() ? null : msgs.get(0);
            long count = participantRepository.countByRoomId(room.getId());

            conversationSet.add(ConversationResponse.builder()
                    .id("room_" + room.getId())
                    .type("room")
                    .name(room.getName())
                    .roomId(room.getId())
                    .lastMessage(lastMsg != null ? lastMsg.getContent() : null)
                    .lastMessageAt(lastMsg != null ? lastMsg.getCreatedAt() : room.getCreatedAt())
                    .participantCount((int) count)
                    .build());
        }

        // Find DM partners via direct query
        List<String> dmPartnerIds = messageRepository.findDmPartnerIds(userId);

        for (String partnerId : dmPartnerIds) {
            if (partnerId == null || partnerId.equals(userId)) continue;
            Optional<User> partnerOpt = userRepository.findById(partnerId);
            if (partnerOpt.isEmpty()) continue;
            User partner = partnerOpt.get();

            List<Message> dmMsgs = messageRepository.findConversation(userId, partnerId, PageRequest.of(0, 1));
            Message lastMsg = dmMsgs.isEmpty() ? null : dmMsgs.get(0);

            conversationSet.add(ConversationResponse.builder()
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

        List<ConversationResponse> conversations = new ArrayList<>(conversationSet);
        conversations.sort((a, b) -> {
            if (a.getLastMessageAt() == null && b.getLastMessageAt() == null) return 0;
            if (a.getLastMessageAt() == null) return 1;
            if (b.getLastMessageAt() == null) return -1;
            return b.getLastMessageAt().compareTo(a.getLastMessageAt());
        });

        return conversations;
    }

    /**
     * Batch-load all message senders into a user map, then map all messages in one pass.
     * Eliminates the N+1 query issue where toResponse() calls findById per message.
     */
    private List<MessageResponse> toResponsesWithBatchUsers(List<Message> messages) {
        if (messages.isEmpty()) return List.of();

        // Batch-load ALL unique sender IDs in a single query
        Set<String> senderIds = messages.stream()
                .map(Message::getSenderId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<String, User> userMap = senderIds.isEmpty() ? Collections.emptyMap()
                : userRepository.findAllById(senderIds).stream()
                        .collect(Collectors.toMap(User::getId, u -> u));

        return messages.stream()
                .map(msg -> toResponse(msg, userMap))
                .toList();
    }

    private MessageResponse toResponse(Message message) {
        User sender = userRepository.findById(message.getSenderId()).orElse(null); // single message, fine
        return buildResponse(message, sender);
    }

    private MessageResponse toResponse(Message message, Map<String, User> userMap) {
        User sender = userMap.get(message.getSenderId());
        return buildResponse(message, sender);
    }

    private MessageResponse buildResponse(Message message, User sender) {
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
