package com.devsync.notification;

import com.devsync.common.ResourceNotFoundException;
import com.devsync.notification.dto.NotificationResponse;
import com.devsync.notification.entity.Notification;
import com.devsync.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public List<NotificationResponse> getNotifications(String userId, int limit) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, limit)).stream()
                .map(this::toResponse)
                .toList();
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
