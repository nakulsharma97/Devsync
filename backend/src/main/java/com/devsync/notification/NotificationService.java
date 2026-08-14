package com.devsync.notification;

import com.devsync.common.PageResponse;
import com.devsync.common.ResourceNotFoundException;
import com.devsync.notification.dto.NotificationResponse;
import com.devsync.notification.entity.Notification;
import com.devsync.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    /** Max page size the paginated list endpoint accepts. */
    private static final int MAX_PAGE_SIZE = 100;

    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> getNotifications(String userId, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Page<Notification> notifications = notificationRepository
                .findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(safePage, safeSize));
        return PageResponse.<NotificationResponse>builder()
                .content(notifications.getContent().stream().map(this::toResponse).toList())
                .page(notifications.getNumber())
                .size(notifications.getSize())
                .totalElements(notifications.getTotalElements())
                .totalPages(notifications.getTotalPages())
                .last(notifications.isLast())
                .build();
    }

    public long getUnreadCount(String userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    @Transactional
    public void markAsRead(String notificationId, String userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", notificationId));
        if (!notification.getUserId().equals(userId))
            throw new IllegalArgumentException("Not your notification");
        notification.setRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllAsRead(String userId) {
        notificationRepository.markAllAsRead(userId);
    }

    @Transactional
    public NotificationResponse createNotification(String userId, String type, String title, String message,
            String actorId, String actorName, String actorAvatar,
            String referenceId, String referenceType, String actionUrl) {

        Notification notification = notificationRepository.save(Notification.builder()
                .userId(userId).type(type).title(title).message(message)
                .actorId(actorId).actorName(actorName).actorAvatar(actorAvatar)
                .referenceId(referenceId).referenceType(referenceType).actionUrl(actionUrl)
                .build());

        NotificationResponse response = toResponse(notification);
        messagingTemplate.convertAndSendToUser(userId, "/queue/notifications", response);
        return response;
    }

    private NotificationResponse toResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId()).type(notification.getType()).title(notification.getTitle())
                .message(notification.getMessage()).actorId(notification.getActorId())
                .actorName(notification.getActorName()).actorAvatar(notification.getActorAvatar())
                .referenceId(notification.getReferenceId()).referenceType(notification.getReferenceType())
                .read(notification.isRead()).actionUrl(notification.getActionUrl())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
