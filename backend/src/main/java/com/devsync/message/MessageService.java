package com.devsync.message;

import com.devsync.activity.ActivityService;
import com.devsync.activity.entity.ActivityType;
import com.devsync.attachment.AttachmentService;
import com.devsync.attachment.dto.AttachmentResponse;
import com.devsync.common.ResourceNotFoundException;
import com.devsync.presence.PresenceService;
import com.devsync.message.dto.ConversationResponse;
import com.devsync.message.dto.MessageResponse;
import com.devsync.message.dto.SendMessageRequest;
import com.devsync.message.entity.Message;
import com.devsync.message.entity.MessageRead;
import com.devsync.message.entity.MessageStatus;
import com.devsync.message.repository.MessageReadRepository;
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

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageService {

    private static final int MAX_ROOM_READ_BATCH = 1000;

    private final MessageRepository messageRepository;
    private final MessageReadRepository messageReadRepository;
    private final UserRepository userRepository;
    private final TeamRoomRepository roomRepository;
    private final TeamRoomParticipantRepository participantRepository;
    private final ProjectRepository projectRepository;
    private final ActivityService activityService;
    private final AttachmentService attachmentService;
    private final PresenceService presenceService;

    @Transactional
    public MessageResponse sendMessage(SendMessageRequest request, String senderId) {
        // A message must target exactly one conversation — a room or a direct
        // recipient. Messages addressed to nobody (or to both) are rejected.
        boolean hasRoom = request.getRoomId() != null;
        boolean hasReceiver = request.getReceiverId() != null;
        if (hasRoom == hasReceiver) {
            throw new IllegalArgumentException("A message must target either a room or a direct recipient");
        }
        // A message may only carry an attachment the sender uploaded — referencing
        // another user's attachment would leak it into a different conversation.
        if (request.getAttachmentId() != null
                && !attachmentService.isUploader(request.getAttachmentId(), senderId)) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Attachment does not belong to you");
        }
        if (hasReceiver) {
            validateDirectRecipient(request.getReceiverId(), senderId);
        }
        String[] projectId = {null};
        if (request.getRoomId() != null) {
            // Sending into a room requires membership — same rule as reading a room.
            if (!participantRepository.existsByRoomIdAndUserId(request.getRoomId(), senderId)) {
                throw new IllegalArgumentException("You are not a participant in this room");
            }
            roomRepository.findById(request.getRoomId()).ifPresent(room -> {
                if (room.getProjectId() != null) {
                    projectId[0] = room.getProjectId();
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
                .attachmentId(request.getAttachmentId())
                .build();
        message = messageRepository.save(message);
        activityService.record(senderId, projectId[0], ActivityType.MESSAGE_SENT,
                "Message sent", snippet(message.getContent()), null);
        return toResponse(message);
    }

    /**
     * A direct message may only be sent to an existing, active account. The
     * sender is already validated by the JWT filter (blocked/deleted users are
     * unauthenticated), so only the recipient is checked here.
     */
    private void validateDirectRecipient(String receiverId, String senderId) {
        if (receiverId.equals(senderId)) {
            throw new IllegalArgumentException("You cannot send a message to yourself");
        }
        User receiver = userRepository.findById(receiverId)
                .orElseThrow(() -> new IllegalArgumentException("Recipient not found"));
        if (receiver.isDeleted()) {
            throw new IllegalArgumentException("Recipient account is no longer available");
        }
        if (receiver.isBlocked()) {
            throw new IllegalArgumentException("Recipient account is blocked");
        }
    }

    /**
     * Called after a real-time broadcast: the message has left the server, so
     * its status advances SENT → DELIVERED (unless already read, which never
     * regresses).
     */
    @Transactional
    public void markDelivered(String messageId) {
        messageRepository.markDelivered(messageId, MessageStatus.DELIVERED, MessageStatus.SENT);
    }

    /**
     * Opening a DM marks every inbound message from {@code otherUserId} as READ.
     * Returns the remaining unread count for that conversation (0 after a
     * successful mark) so the client can sync its badge.
     */
    @Transactional
    public long markDirectRead(String otherUserId, String userId) {
        if (otherUserId.equals(userId)) {
            throw new IllegalArgumentException("Invalid conversation");
        }
        messageRepository.markDirectRead(otherUserId, userId, MessageStatus.READ, Instant.now());
        return unreadDirectCount(otherUserId, userId);
    }

    /**
     * Opening a room inserts read receipts for every unread message in it and
     * returns the remaining unread count. Only participants may mark a room read
     * (same rule as reading or sending into it).
     */
    @Transactional
    public long markRoomRead(String roomId, String userId) {
        if (!participantRepository.existsByRoomIdAndUserId(roomId, userId)) {
            throw new IllegalArgumentException("You are not a participant in this room");
        }
        List<String> unreadIds = messageReadRepository.findUnreadMessageIdsByRoom(roomId, userId);
        if (unreadIds.size() > MAX_ROOM_READ_BATCH) {
            // Pathological backlog: mark the most recent messages, keep older
            // ones unread rather than issuing one giant write.
            unreadIds = unreadIds.subList(unreadIds.size() - MAX_ROOM_READ_BATCH, unreadIds.size());
        }
        if (!unreadIds.isEmpty()) {
            Instant now = Instant.now();
            messageReadRepository.saveAll(unreadIds.stream()
                    .map(id -> MessageRead.builder()
                            .messageId(id).userId(userId).readAt(now).build())
                    .toList());
        }
        return messageReadRepository.countUnreadByRoom(roomId, userId);
    }

    private long unreadDirectCount(String partnerId, String userId) {
        return messageRepository.countBySenderIdAndReceiverIdAndStatusNotAndHiddenFalse(
                partnerId, userId, MessageStatus.READ);
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
                    .unreadCount((int) messageReadRepository.countUnreadByRoom(room.getId(), userId))
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
                    .otherUserPresence(presenceService.effectiveStatus(partner))
                    .otherUserLastActiveAt(partner.getLastActiveAt())
                    .avatarUrl(partner.getAvatarUrl())
                    .lastMessage(lastMsg != null ? lastMsg.getContent() : null)
                    .lastMessageAt(lastMsg != null ? lastMsg.getCreatedAt() : partner.getCreatedAt())
                    .unreadCount((int) unreadDirectCount(partnerId, userId))
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

    private String snippet(String content) {
        if (content == null) return "";
        String trimmed = content.trim().replaceAll("\\s+", " ");
        return trimmed.length() > 80 ? trimmed.substring(0, 80) + "..." : trimmed;
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

        Set<String> attachmentIds = messages.stream()
                .map(Message::getAttachmentId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<String, AttachmentResponse> attachmentMap = attachmentService.batchByIds(attachmentIds);

        return messages.stream()
                .map(msg -> toResponse(msg, userMap, attachmentMap))
                .toList();
    }

    private MessageResponse toResponse(Message message) {
        User sender = userRepository.findById(message.getSenderId()).orElse(null); // single message, fine
        AttachmentResponse attachment = message.getAttachmentId() != null
                ? attachmentService.batchByIds(Set.of(message.getAttachmentId())).get(message.getAttachmentId())
                : null;
        return buildResponse(message, sender, attachment);
    }

    private MessageResponse toResponse(Message message, Map<String, User> userMap,
                                       Map<String, AttachmentResponse> attachmentMap) {
        User sender = userMap.get(message.getSenderId());
        AttachmentResponse attachment = message.getAttachmentId() != null
                ? attachmentMap.get(message.getAttachmentId())
                : null;
        return buildResponse(message, sender, attachment);
    }

    private MessageResponse buildResponse(Message message, User sender, AttachmentResponse attachment) {
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
                .attachmentId(message.getAttachmentId())
                .attachment(attachment)
                .status(message.getStatus() != null ? message.getStatus().name() : "SENT")
                .readAt(message.getReadAt())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
