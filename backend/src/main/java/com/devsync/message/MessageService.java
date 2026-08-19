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
import com.devsync.message.entity.MessageReaction;
import com.devsync.message.entity.MessageStatus;
import com.devsync.message.repository.MessageReadRepository;
import com.devsync.message.repository.MessageReactionRepository;
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
import org.springframework.security.access.AccessDeniedException;
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
    private final MessageReactionRepository reactionRepository;
    private final UserRepository userRepository;
    private final TeamRoomRepository roomRepository;
    private final TeamRoomParticipantRepository participantRepository;
    private final ProjectRepository projectRepository;
    private final ActivityService activityService;
    private final AttachmentService attachmentService;
    private final PresenceService presenceService;

    @Transactional
    public MessageResponse sendMessage(SendMessageRequest request, String senderId) {
        // Content must be non-null and non-blank — defend at the service level
        // even though the controller's @NotBlank catches most cases, so tests
        // and internal callers also get a clear error instead of an NPE or DB
        // constraint violation.
        if (request.getContent() == null || request.getContent().isBlank()) {
            throw new IllegalArgumentException("Message content is required");
        }
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
            throw new AccessDeniedException(
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
        if (request.getParentMessageId() != null) {
            // Reply: the parent must exist and live in the same conversation — a
            // reply can never jump across rooms/DMs. For a room, the room must
            // match; for a DM, the reply sender must be one of the parent's two
            // participants (the parent's sender or receiver) and the reply must
            // be addressed to the other one.
            Message parent = messageRepository.findById(request.getParentMessageId())
                    .orElseThrow(() -> new ResourceNotFoundException("Message", request.getParentMessageId()));
            boolean sameConversation;
            if (parent.getRoomId() != null) {
                sameConversation = Objects.equals(parent.getRoomId(), request.getRoomId());
            } else {
                boolean replyToParentSender = Objects.equals(parent.getSenderId(), senderId)
                        && Objects.equals(parent.getReceiverId(), request.getReceiverId());
                boolean replyToParentReceiver = Objects.equals(parent.getReceiverId(), senderId)
                        && Objects.equals(parent.getSenderId(), request.getReceiverId());
                sameConversation = replyToParentSender || replyToParentReceiver;
            }
            if (parent.isHidden() || !sameConversation) {
                throw new IllegalArgumentException("Reply does not belong to this conversation");
            }
        }
        Message message = Message.builder()
                .senderId(senderId)
                .roomId(request.getRoomId())
                .receiverId(request.getReceiverId())
                .content(request.getContent())
                .messageType(request.getMessageType() != null ? request.getMessageType() : "text")
                .systemMessage(request.isSystemMessage())
                .attachmentId(request.getAttachmentId())
                .parentMessageId(request.getParentMessageId())
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

    /**
     * Total unread messages across every conversation the user is part of
     * (direct messages + team rooms). Backs the header/nav unread badge — a
     * single aggregate query per side, never a per-conversation loop.
     */
    @Transactional(readOnly = true)
    public long getTotalUnreadCount(String userId) {
        return messageReadRepository.countUnreadRoomsForUser(userId)
                + messageRepository.countBySenderIdNotAndReceiverIdAndStatusNotAndHiddenFalse(
                        userId, userId, MessageStatus.READ);
    }

    private long unreadDirectCount(String partnerId, String userId) {
        return messageRepository.countBySenderIdAndReceiverIdAndStatusNotAndHiddenFalse(
                partnerId, userId, MessageStatus.READ);
    }

    /**
     * Returns the most recent messages in a room (newest-first from the DB,
     * reversed so the caller receives oldest-to-newest for rendering).
     * Pass {@code null} as {@code cursorId} for the initial load; subsequent
     * scroll-up calls pass the oldest message id from the current batch.
     */
    public List<MessageResponse> getRoomMessages(String roomId, String userId, String cursorId, int limit) {
        if (roomId != null && !participantRepository.existsByRoomIdAndUserId(roomId, userId)) {
            throw new IllegalArgumentException("You are not a participant in this room");
        }
        int safeLimit = Math.min(Math.max(limit, 1), 200);
        List<Message> messages;
        if (cursorId != null && !cursorId.isBlank()) {
            // Paginate backward: fetch messages older than cursorId.
            messages = messageRepository
                    .findByRoomIdAndIdLessThanOrderByCreatedAtDesc(roomId, cursorId, PageRequest.of(0, safeLimit));
        } else {
            // Initial load: fetch the most recent N messages.
            messages = messageRepository
                    .findByRoomIdOrderByCreatedAtDesc(roomId, PageRequest.of(0, safeLimit));
        }
        // Reverse so results are oldest-to-newest for the UI.
        List<Message> reversed = new java.util.ArrayList<>(messages);
        java.util.Collections.reverse(reversed);
        return toResponsesWithBatchUsers(reversed.stream().filter(m -> !m.isHidden()).toList(), userId);
    }

    /** Backward-compatible overload: initial load only, no cursor. */
    public List<MessageResponse> getRoomMessages(String roomId, String userId) {
        return getRoomMessages(roomId, userId, null, 100);
    }

    public List<MessageResponse> getConversation(String userId, String otherId, int limit) {
        List<Message> messages = messageRepository.findConversation(userId, otherId, PageRequest.of(0, limit))
                .stream().filter(m -> !m.isHidden()).toList();
        return toResponsesWithBatchUsers(messages, userId);
    }

    // ── Message upgrades: edit / delete / react / threads / search ──────

    /**
     * Edits a message. Only the sender (or a global admin) may edit; hidden
     * (deleted) messages are immutable. The conversation access rules are the
     * same as reading: the editor must be a participant.
     */
    @Transactional
    public MessageResponse editMessage(String messageId, String userId, String newContent) {
        if (newContent == null || newContent.isBlank()) {
            throw new IllegalArgumentException("Message content is required");
        }
        Message message = findAccessibleMessage(messageId, userId);
        if (!message.getSenderId().equals(userId) && !isAdmin(userId)) {
            throw new AccessDeniedException("Only the sender can edit this message");
        }
        message.setContent(newContent.trim());
        message.setEdited(true);
        message.setEditedAt(Instant.now());
        messageRepository.save(message);
        return toResponse(message);
    }

    /**
     * Soft-deletes a message (sets {@code hidden}) so threads and history stay
     * consistent — the row is never physically removed. Only the sender (or a
     * global admin) may delete.
     */
    @Transactional
    public void deleteMessage(String messageId, String userId) {
        Message message = findAccessibleMessage(messageId, userId);
        if (!message.getSenderId().equals(userId) && !isAdmin(userId)) {
            throw new AccessDeniedException("Only the sender can delete this message");
        }
        message.setHidden(true);
        messageRepository.save(message);
    }

    /**
     * Toggles the caller's reaction on a message. Returns the full aggregated
     * reaction state so clients can apply it atomically.
     */
    @Transactional
    public List<MessageResponse.ReactionDto> toggleReaction(String messageId, String userId, String emoji) {
        if (emoji == null || emoji.isBlank() || emoji.length() > 16) {
            throw new IllegalArgumentException("A valid emoji is required");
        }
        findAccessibleMessage(messageId, userId);
        reactionRepository.findByMessageIdAndUserIdAndEmoji(messageId, userId, emoji)
                .ifPresentOrElse(
                        reactionRepository::delete,
                        () -> reactionRepository.save(MessageReaction.builder()
                                .messageId(messageId).userId(userId).emoji(emoji).build()));
        return reactionSummary(messageId, userId);
    }

    /** Reply thread: every message replying to {@code parentMessageId} (oldest first). */
    @Transactional(readOnly = true)
    public List<MessageResponse> getThread(String parentMessageId, String userId) {
        // Access is derived from the parent's conversation.
        findAccessibleMessage(parentMessageId, userId);
        return toResponsesWithBatchUsers(
                messageRepository.findByParentMessageIdOrderByCreatedAtAsc(parentMessageId), userId);
    }

    /**
     * Search the caller's own conversations (DMs + rooms they participate in).
     * A user can never search another conversation's messages.
     */
    @Transactional(readOnly = true)
    public List<MessageResponse> searchMessages(String userId, String keyword, int limit) {
        if (keyword == null || keyword.isBlank()) {
            throw new IllegalArgumentException("A search keyword is required");
        }
        String k = keyword.trim();
        List<Message> found = messageRepository.searchMessagesForUser(k, userId,
                PageRequest.of(0, Math.min(Math.max(limit, 1), 50)));
        return toResponsesWithBatchUsers(found.stream().filter(m -> !m.isHidden()).toList(), userId);
    }

    /** Internal: resolves a message for broadcast routing (no auth — caller already authorized the mutation). */
    public Message findForBroadcast(String messageId) {
        return messageRepository.findById(messageId).orElse(null);
    }

    private Message findAccessibleMessage(String messageId, String userId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message", messageId));
        if (message.isHidden()) {
            throw new ResourceNotFoundException("Message", messageId);
        }
        if (message.getRoomId() != null) {
            if (!participantRepository.existsByRoomIdAndUserId(message.getRoomId(), userId)) {
                throw new AccessDeniedException("You are not a participant in this conversation");
            }
        } else {
            boolean involved = message.getSenderId().equals(userId)
                    || message.getReceiverId().equals(userId);
            if (!involved && !isAdmin(userId)) {
                throw new AccessDeniedException("You are not a participant in this conversation");
            }
        }
        return message;
    }

    private boolean isAdmin(String userId) {
        return userRepository.findById(userId)
                .map(u -> u.getRole() == User.Role.ADMIN)
                .orElse(false);
    }

    /** Aggregates reactions for a set of message ids (batch, no N+1). */
    private Map<String, List<MessageResponse.ReactionDto>> reactionsByMessage(Collection<String> messageIds,
                                                                              String userId) {
        if (messageIds.isEmpty()) return Collections.emptyMap();
        List<MessageReaction> all = reactionRepository.findByMessageIdIn(messageIds);
        Map<String, List<MessageReaction>> byMessage = all.stream()
                .collect(Collectors.groupingBy(MessageReaction::getMessageId));
        Map<String, List<MessageResponse.ReactionDto>> result = new HashMap<>();
        for (Map.Entry<String, List<MessageReaction>> e : byMessage.entrySet()) {
            Map<String, Long> counts = e.getValue().stream()
                    .collect(Collectors.groupingBy(MessageReaction::getEmoji, Collectors.counting()));
            result.put(e.getKey(), counts.entrySet().stream()
                    .map(en -> MessageResponse.ReactionDto.builder()
                            .emoji(en.getKey())
                            .count(en.getValue())
                            .reactedByMe(e.getValue().stream()
                                    .anyMatch(r -> r.getUserId().equals(userId) && r.getEmoji().equals(en.getKey())))
                            .build())
                    .sorted(Comparator.comparing(MessageResponse.ReactionDto::getEmoji))
                    .toList());
        }
        return result;
    }

    private List<MessageResponse.ReactionDto> reactionSummary(String messageId, String userId) {
        if (messageId == null) {
            // Unsaved message (e.g. inside a unit test with a mocked repository).
            return List.of();
        }
        return reactionsByMessage(Set.of(messageId), userId).getOrDefault(messageId, List.of());
    }

    public List<ConversationResponse> getConversations(String userId) {
        Set<ConversationResponse> conversationSet = new LinkedHashSet<>();

        // Get all team rooms the user is part of
        List<TeamRoom> rooms = roomRepository.findRoomsByUserId(userId);
        // Batch-load project names so the UI can show the owning project for
        // each team chat (no N+1 across the room list).
        Set<String> roomProjectIds = rooms.stream()
                .map(TeamRoom::getProjectId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<String, String> projectNames = roomProjectIds.isEmpty() ? Collections.emptyMap()
                : projectRepository.findAllById(roomProjectIds).stream()
                        .collect(Collectors.toMap(Project::getId, Project::getName, (a, b) -> a));

        for (TeamRoom room : rooms) {
            // DESC + limit 1 gives the MOST recent message (preview).
            List<Message> roomMsgs = messageRepository.findByRoomIdOrderByCreatedAtDesc(
                    room.getId(), PageRequest.of(0, 1));
            Message lastMsg = roomMsgs.isEmpty() ? null : roomMsgs.get(0);
            long count = participantRepository.countByRoomId(room.getId());

            conversationSet.add(ConversationResponse.builder()
                    .id("room_" + room.getId())
                    .type("room")
                    .name(room.getName())
                    .projectName(room.getProjectId() != null ? projectNames.get(room.getProjectId()) : null)
                    .roomId(room.getId())
                    .lastMessage(lastMsg != null ? lastMsg.getContent() : null)
                    .lastMessageAt(lastMsg != null ? lastMsg.getCreatedAt() : room.getCreatedAt())
                    .unreadCount((int) messageReadRepository.countUnreadByRoom(room.getId(), userId))
                    .participantCount((int) count)
                    .build());
        }

        // Find DM partners via direct query
        List<String> dmPartnerIds = messageRepository.findDmPartnerIds(userId);

        // Batch-load all partner users in a single query (no N+1).
        Set<String> validPartnerIds = dmPartnerIds.stream()
                .filter(pid -> pid != null && !pid.equals(userId))
                .collect(Collectors.toSet());
        Map<String, User> partnerMap = validPartnerIds.isEmpty() ? Collections.emptyMap()
                : userRepository.findAllById(validPartnerIds).stream()
                        .collect(Collectors.toMap(User::getId, u -> u));

        for (String partnerId : validPartnerIds) {
            User partner = partnerMap.get(partnerId);
            if (partner == null) continue;

            // Fetch the most recent DM message for the preview.
            // findConversation orders ASC; fetch limit+1 then pop the last element.
            List<Message> dmMsgs = messageRepository.findConversation(userId, partnerId, PageRequest.of(0, 2));
            Message lastDmMsg = dmMsgs.isEmpty() ? null : dmMsgs.get(dmMsgs.size() - 1);

            conversationSet.add(ConversationResponse.builder()
                    .id("dm_" + partnerId)
                    .type("direct")
                    .name(partner.getFullName())
                    .otherUserId(partnerId)
                    .otherUserName(partner.getFullName())
                    .otherUserPresence(presenceService.effectiveStatus(partner))
                    .otherUserLastActiveAt(partner.getLastActiveAt())
                    .avatarUrl(partner.getAvatarUrl())
                    .lastMessage(lastDmMsg != null ? lastDmMsg.getContent() : null)
                    .lastMessageAt(lastDmMsg != null ? lastDmMsg.getCreatedAt() : partner.getCreatedAt())
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
     * Batch-load senders, attachments, reactions and reply counts, then map all
     * messages in one pass. Eliminates the N+1 query issue where toResponse()
     * calls findById per message.
     */
    private List<MessageResponse> toResponsesWithBatchUsers(List<Message> messages, String viewerId) {
        if (messages.isEmpty()) return List.of();

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

        Set<String> messageIds = messages.stream().map(Message::getId).collect(Collectors.toSet());
        Map<String, List<MessageResponse.ReactionDto>> reactions = reactionsByMessage(messageIds, viewerId);
        Map<String, Long> replyCounts = messageRepository.countByParentMessageIdIn(messageIds).stream()
                .collect(Collectors.toMap(row -> (String) row[0], row -> (Long) row[1]));

        return messages.stream()
                .map(msg -> buildResponse(msg, userMap.get(msg.getSenderId()),
                        attachmentMap.get(msg.getAttachmentId()),
                        reactions.getOrDefault(msg.getId(), List.of()),
                        replyCounts.getOrDefault(msg.getId(), 0L)))
                .toList();
    }

    private MessageResponse toResponse(Message message) {
        User sender = userRepository.findById(message.getSenderId()).orElse(null);
        AttachmentResponse attachment = message.getAttachmentId() != null
                ? attachmentService.batchByIds(Set.of(message.getAttachmentId())).get(message.getAttachmentId())
                : null;
        return buildResponse(message, sender, attachment,
                reactionSummary(message.getId(), message.getSenderId()),
                message.getId() != null ? messageRepository.countByParentMessageId(message.getId()) : 0L);
    }

    private MessageResponse buildResponse(Message message, User sender, AttachmentResponse attachment,
                                          List<MessageResponse.ReactionDto> reactions, long replyCount) {
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
                .parentMessageId(message.getParentMessageId())
                .edited(message.isEdited())
                .editedAt(message.getEditedAt())
                .reactions(reactions)
                .replyCount(replyCount)
                .build();
    }
}
