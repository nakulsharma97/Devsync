package com.devsync.support;

import com.devsync.audit.AuditLogService;
import com.devsync.audit.entity.AuditAction;
import com.devsync.audit.entity.AuditStatus;
import com.devsync.common.PageResponse;
import com.devsync.common.ResourceNotFoundException;
import com.devsync.notification.NotificationService;
import com.devsync.support.dto.*;
import com.devsync.support.entity.SupportTicket;
import com.devsync.support.entity.SupportTicketReply;
import com.devsync.support.repository.SupportTicketReplyRepository;
import com.devsync.support.repository.SupportTicketRepository;
import com.devsync.user.entity.User;
import com.devsync.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SupportTicketService {

    private static final int MAX_PAGE_SIZE = 100;

    private final SupportTicketRepository ticketRepository;
    private final SupportTicketReplyRepository replyRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    /** Monotonically increasing ticket number sequence. */
    private static final AtomicLong TICKET_SEQ = new AtomicLong(0);

    // ── User-facing ──────────────────────────────────────────

    @Transactional(readOnly = true)
    public PageResponse<SupportTicketResponse> getUserTickets(String userId, int page, int size, String search) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        String searchFilter = (search == null || search.isBlank()) ? null : search.trim();
        Page<SupportTicket> tickets = ticketRepository.searchUserTickets(userId, searchFilter, pageable);

        Map<String, User> userMap = batchUsers(List.of(userRepository.findById(userId).orElse(null)));
        Map<String, Long> replyCounts = batchReplyCounts(tickets.getContent());

        return PageResponse.<SupportTicketResponse>builder()
                .content(tickets.getContent().stream()
                        .map(t -> toResponse(t, userMap, replyCounts.getOrDefault(t.getId(), 0L)))
                        .toList())
                .page(tickets.getNumber())
                .size(tickets.getSize())
                .totalElements(tickets.getTotalElements())
                .totalPages(tickets.getTotalPages())
                .last(tickets.isLast())
                .build();
    }

    @Transactional(readOnly = true)
    public SupportTicketResponse getUserTicket(String ticketId, String userId) {
        SupportTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("SupportTicket", ticketId));
        if (!ticket.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Not your support ticket");
        }
        Map<String, User> userMap = batchUsers(List.of(userRepository.findById(userId).orElse(null)));
        long replyCount = replyRepository.countByTicketIdAndAdminReplyTrue(ticketId);
        return toResponse(ticket, userMap, replyCount);
    }

    @Transactional
    public SupportTicketResponse createTicket(String userId, CreateSupportTicketRequest request) {
        SupportTicketPriority priority = parsePriority(request.getPriority());

        String ticketNumber = generateTicketNumber();

        SupportTicket ticket = SupportTicket.builder()
                .ticketNumber(ticketNumber)
                .userId(userId)
                .subject(request.getSubject())
                .description(request.getDescription())
                .category(request.getCategory())
                .priority(priority)
                .build();

        ticket = ticketRepository.save(ticket);

        // Notify all admins about new support ticket
        User ticketUser = userRepository.findById(userId).orElse(null);
        String userName = ticketUser != null ? ticketUser.getFullName() : "Unknown";
        String priorityLabel = priority == SupportTicketPriority.HIGH || priority == SupportTicketPriority.URGENT
                ? priority.name() + " " : "";
        String title = "New support request " + ticketNumber;
        String message = priorityLabel + "New support request " + ticketNumber + " from " + userName + ": " + request.getSubject();

        notifyAllAdmins(title, message, ticket.getId(), ticketNumber,
                ticketUser != null ? ticketUser.getFullName() : null,
                ticketUser != null ? ticketUser.getAvatarUrl() : null);

        // Audit log
        auditLogService.record(userId, userId, AuditAction.SUPPORT_TICKET_CREATED, AuditStatus.SUCCESS,
                "Created support ticket " + ticketNumber + " - " + request.getSubject());

        Map<String, User> userMap = batchUsers(List.of(ticketUser));
        return toResponse(ticket, userMap, 0L);
    }

    @Transactional(readOnly = true)
    public List<SupportTicketReplyResponse> getTicketReplies(String ticketId, String userId) {
        SupportTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("SupportTicket", ticketId));
        if (!ticket.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Not your support ticket");
        }
        List<SupportTicketReply> replies = replyRepository.findByTicketIdOrderByCreatedAtAsc(ticketId);
        // Exclude internal notes from user view
        replies = replies.stream().filter(r -> !r.isInternalNote()).toList();
        Set<String> userIds = replies.stream().map(SupportTicketReply::getUserId).collect(Collectors.toSet());
        Map<String, User> userMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        return replies.stream().map(r -> toReplyResponse(r, userMap)).toList();
    }

    @Transactional
    public SupportTicketReplyResponse addReply(String ticketId, String userId, ReplySupportTicketRequest request) {
        SupportTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("SupportTicket", ticketId));
        if (!ticket.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Not your support ticket");
        }

        SupportTicketReply reply = SupportTicketReply.builder()
                .ticketId(ticketId)
                .userId(userId)
                .message(request.getMessage())
                .adminReply(false)
                .build();
        reply = replyRepository.save(reply);

        // Re-open ticket if it was resolved/closed
        if (ticket.getStatus() == SupportTicketStatus.RESOLVED ||
            ticket.getStatus() == SupportTicketStatus.CLOSED) {
            ticket.setStatus(SupportTicketStatus.OPEN);
            ticketRepository.save(ticket);
        }

        // Notify admins that user replied
        User ticketUser = userRepository.findById(userId).orElse(null);
        String userName = ticketUser != null ? ticketUser.getFullName() : "Unknown";
        String title = "User replied to " + ticket.getTicketNumber();
        String message = userName + " replied to support request " + ticket.getTicketNumber();

        notifyAllAdmins(title, message, ticketId, ticket.getTicketNumber(),
                ticketUser != null ? ticketUser.getFullName() : null,
                ticketUser != null ? ticketUser.getAvatarUrl() : null);

        Map<String, User> userMap = batchUsers(List.of(ticketUser));
        return toReplyResponse(reply, userMap);
    }

    // ── Admin-facing ─────────────────────────────────────────

    @Transactional(readOnly = true)
    public PageResponse<SupportTicketResponse> getAdminTickets(
            int page, int size, String search, String status,
            String priority, String assignedTo, String from, String to) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        SupportTicketStatus statusFilter = parseStatus(status);
        SupportTicketPriority priorityFilter = parsePriority(priority);
        Instant fromInstant = parseInstant(from);
        Instant toInstant = parseInstant(to);
        String searchFilter = (search == null || search.isBlank()) ? null : search.trim();

        Page<SupportTicket> tickets = ticketRepository.searchAdminTickets(
                statusFilter, priorityFilter, blankToNull(assignedTo), searchFilter,
                fromInstant, toInstant, pageable);

        Set<String> userIds = new HashSet<>();
        userIds.addAll(tickets.getContent().stream().map(SupportTicket::getUserId).collect(Collectors.toSet()));
        userIds.addAll(tickets.getContent().stream()
                .filter(t -> t.getAssignedTo() != null)
                .map(SupportTicket::getAssignedTo)
                .collect(Collectors.toSet()));
        Map<String, User> userMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
        Map<String, Long> replyCounts = batchReplyCounts(tickets.getContent());

        return PageResponse.<SupportTicketResponse>builder()
                .content(tickets.getContent().stream()
                        .map(t -> toResponse(t, userMap, replyCounts.getOrDefault(t.getId(), 0L)))
                        .toList())
                .page(tickets.getNumber())
                .size(tickets.getSize())
                .totalElements(tickets.getTotalElements())
                .totalPages(tickets.getTotalPages())
                .last(tickets.isLast())
                .build();
    }

    @Transactional(readOnly = true)
    public SupportTicketResponse getAdminTicket(String ticketId) {
        SupportTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("SupportTicket", ticketId));
        Set<String> userIds = new HashSet<>();
        userIds.add(ticket.getUserId());
        if (ticket.getAssignedTo() != null) userIds.add(ticket.getAssignedTo());
        Map<String, User> userMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
        long replyCount = replyRepository.countByTicketIdAndAdminReplyTrue(ticketId);
        return toResponse(ticket, userMap, replyCount);
    }

    @Transactional(readOnly = true)
    public List<SupportTicketReplyResponse> getAdminTicketReplies(String ticketId) {
        ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("SupportTicket", ticketId));
        List<SupportTicketReply> replies = replyRepository.findByTicketIdOrderByCreatedAtAsc(ticketId);
        Set<String> userIds = replies.stream().map(SupportTicketReply::getUserId).collect(Collectors.toSet());
        Map<String, User> userMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
        return replies.stream().map(r -> toReplyResponse(r, userMap)).toList();
    }

    @Transactional
    public SupportTicketReplyResponse adminReply(String ticketId, String adminId, ReplySupportTicketRequest request) {
        SupportTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("SupportTicket", ticketId));

        SupportTicketReply reply = SupportTicketReply.builder()
                .ticketId(ticketId)
                .userId(adminId)
                .message(request.getMessage())
                .adminReply(true)
                .internalNote(request.isInternalNote())
                .build();
        reply = replyRepository.save(reply);

        // Set status to WAITING_USER when admin replies (not for internal notes)
        if (!request.isInternalNote() &&
            (ticket.getStatus() == SupportTicketStatus.OPEN ||
             ticket.getStatus() == SupportTicketStatus.IN_PROGRESS)) {
            ticket.setStatus(SupportTicketStatus.WAITING_USER);
            ticketRepository.save(ticket);
        }

        // Notify user about admin reply (not for internal notes)
        if (!request.isInternalNote()) {
            User adminUser = userRepository.findById(adminId).orElse(null);
            String adminName = adminUser != null ? adminUser.getFullName() : "Admin";
            notificationService.createNotification(
                    ticket.getUserId(),
                    "SUPPORT_REPLY",
                    "Admin replied to " + ticket.getTicketNumber(),
                    adminName + " replied to your support request " + ticket.getTicketNumber(),
                    adminId,
                    adminName,
                    adminUser != null ? adminUser.getAvatarUrl() : null,
                    ticketId,
                    "support_ticket",
                    "/support");
        }

        // Audit log
        String actionDetail = request.isInternalNote()
                ? "Added internal note to " + ticket.getTicketNumber()
                : "Replied to " + ticket.getTicketNumber();
        auditLogService.record(adminId, ticket.getUserId(), AuditAction.SUPPORT_TICKET_REPLIED,
                AuditStatus.SUCCESS, actionDetail);

        Map<String, User> userMap = batchUsers(List.of(userRepository.findById(adminId).orElse(null)));
        return toReplyResponse(reply, userMap);
    }

    @Transactional
    public SupportTicketResponse updateStatus(String ticketId, String status, String adminId) {
        SupportTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("SupportTicket", ticketId));

        SupportTicketStatus oldStatus = ticket.getStatus();
        SupportTicketStatus newStatus = parseStatus(status);
        ticket.setStatus(newStatus);

        if (newStatus == SupportTicketStatus.RESOLVED) {
            ticket.setResolvedAt(Instant.now());
        } else if (newStatus == SupportTicketStatus.CLOSED) {
            ticket.setClosedAt(Instant.now());
        }

        ticket = ticketRepository.save(ticket);

        // Notify user about status change
        User adminUser = userRepository.findById(adminId).orElse(null);
        String adminName = adminUser != null ? adminUser.getFullName() : "Admin";
        String statusLabel = newStatus.name().replace("_", " ").toLowerCase();
        notificationService.createNotification(
                ticket.getUserId(),
                "SUPPORT_STATUS_CHANGED",
                "Support request " + ticket.getTicketNumber() + " status changed",
                "Your support request " + ticket.getTicketNumber() + " is now " + statusLabel,
                adminId,
                adminName,
                adminUser != null ? adminUser.getAvatarUrl() : null,
                ticketId,
                "support_ticket",
                "/support");

        // Audit log
        String auditDetail = "Changed " + ticket.getTicketNumber() + " from " + oldStatus + " to " + newStatus;
        auditLogService.record(adminId, ticket.getUserId(), AuditAction.SUPPORT_TICKET_STATUS_CHANGED,
                AuditStatus.SUCCESS, auditDetail);

        Set<String> userIds = new HashSet<>();
        userIds.add(ticket.getUserId());
        if (ticket.getAssignedTo() != null) userIds.add(ticket.getAssignedTo());
        Map<String, User> userMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
        long replyCount = replyRepository.countByTicketIdAndAdminReplyTrue(ticketId);
        return toResponse(ticket, userMap, replyCount);
    }

    @Transactional
    public SupportTicketResponse assignTicket(String ticketId, String assignedTo, String adminId) {
        SupportTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("SupportTicket", ticketId));

        ticket.setAssignedTo(blankToNull(assignedTo));
        if (ticket.getStatus() == SupportTicketStatus.OPEN) {
            ticket.setStatus(SupportTicketStatus.IN_PROGRESS);
        }
        ticket = ticketRepository.save(ticket);

        // Audit log
        String assigneeName = assignedTo != null ? "admin" : "unassigned";
        auditLogService.record(adminId, ticket.getUserId(), AuditAction.SUPPORT_TICKET_ASSIGNED,
                AuditStatus.SUCCESS, "Assigned " + ticket.getTicketNumber() + " to " + assigneeName);

        Set<String> userIds = new HashSet<>();
        userIds.add(ticket.getUserId());
        if (ticket.getAssignedTo() != null) userIds.add(ticket.getAssignedTo());
        Map<String, User> userMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
        long replyCount = replyRepository.countByTicketIdAndAdminReplyTrue(ticketId);
        return toResponse(ticket, userMap, replyCount);
    }

    @Transactional(readOnly = true)
    public Map<String, Long> getAdminStats() {
        Map<String, Long> stats = new HashMap<>();
        for (SupportTicketStatus s : SupportTicketStatus.values()) {
            stats.put(s.name(), ticketRepository.countByStatus(s));
        }
        return stats;
    }

    // ── Helpers ──────────────────────────────────────────────

    /** Generate a unique ticket number in DEV-XXXX format. */
    private synchronized String generateTicketNumber() {
        // Find the highest existing ticket number and increment
        Long maxNum = ticketRepository.findMaxTicketNumber();
        long nextNum = (maxNum != null ? maxNum : 0) + 1;
        return "DEV-" + nextNum;
    }

    /** Send a notification to all admin users. */
    private void notifyAllAdmins(String title, String message, String referenceId, String ticketNumber,
                                  String actorName, String actorAvatar) {
        List<User> admins = userRepository.findAllByRole(User.Role.ADMIN);
        for (User admin : admins) {
            notificationService.createNotification(
                    admin.getId(),
                    "SUPPORT_TICKET",
                    title,
                    message,
                    referenceId,
                    actorName,
                    actorAvatar,
                    referenceId,
                    "support_ticket",
                    "/admin/support");
        }
    }

    private Map<String, Long> batchReplyCounts(List<SupportTicket> tickets) {
        if (tickets.isEmpty()) return Collections.emptyMap();
        List<String> ticketIds = tickets.stream().map(SupportTicket::getId).toList();
        Map<String, Long> counts = new HashMap<>();
        for (String tid : ticketIds) {
            counts.put(tid, replyRepository.countByTicketIdAndAdminReplyTrue(tid));
        }
        return counts;
    }

    private Map<String, User> batchUsers(List<User> users) {
        if (users == null || users.isEmpty()) return Collections.emptyMap();
        return users.stream().filter(Objects::nonNull)
                .collect(Collectors.toMap(User::getId, u -> u));
    }

    private SupportTicketResponse toResponse(SupportTicket ticket, Map<String, User> userMap, long replyCount) {
        User user = userMap.get(ticket.getUserId());
        User assignee = ticket.getAssignedTo() != null ? userMap.get(ticket.getAssignedTo()) : null;
        return SupportTicketResponse.builder()
                .id(ticket.getId())
                .ticketNumber(ticket.getTicketNumber())
                .userId(ticket.getUserId())
                .userName(user != null ? user.getFullName() : null)
                .userEmail(user != null ? user.getEmail() : null)
                .userAvatarUrl(user != null ? user.getAvatarUrl() : null)
                .subject(ticket.getSubject())
                .description(ticket.getDescription())
                .status(ticket.getStatus().name())
                .priority(ticket.getPriority().name())
                .category(ticket.getCategory())
                .assignedTo(ticket.getAssignedTo())
                .assignedToName(assignee != null ? assignee.getFullName() : null)
                .replyCount(replyCount)
                .resolvedAt(ticket.getResolvedAt())
                .closedAt(ticket.getClosedAt())
                .createdAt(ticket.getCreatedAt())
                .updatedAt(ticket.getUpdatedAt())
                .build();
    }

    private SupportTicketReplyResponse toReplyResponse(SupportTicketReply reply, Map<String, User> userMap) {
        User user = userMap.get(reply.getUserId());
        return SupportTicketReplyResponse.builder()
                .id(reply.getId())
                .ticketId(reply.getTicketId())
                .userId(reply.getUserId())
                .userName(user != null ? user.getFullName() : null)
                .userAvatarUrl(user != null ? user.getAvatarUrl() : null)
                .message(reply.getMessage())
                .adminReply(reply.isAdminReply())
                .internalNote(reply.isInternalNote())
                .createdAt(reply.getCreatedAt())
                .build();
    }

    private SupportTicketPriority parsePriority(String raw) {
        if (raw == null || raw.isBlank()) return SupportTicketPriority.MEDIUM;
        try {
            return SupportTicketPriority.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return SupportTicketPriority.MEDIUM;
        }
    }

    private SupportTicketStatus parseStatus(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return SupportTicketStatus.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid status: " + raw);
        }
    }

    private Instant parseInstant(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return Instant.parse(raw);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid date: " + raw);
        }
    }

    private String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}
