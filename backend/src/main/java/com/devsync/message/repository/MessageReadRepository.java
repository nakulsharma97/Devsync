package com.devsync.message.repository;

import com.devsync.message.entity.MessageRead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MessageReadRepository extends JpaRepository<MessageRead, String> {

    boolean existsByMessageIdAndUserId(String messageId, String userId);

    /** Unread message ids in a room for a user (excluding the user's own and hidden messages). */
    @Query("SELECT m.id FROM Message m WHERE m.roomId = :roomId AND m.senderId <> :userId AND m.hidden = false " +
            "AND NOT EXISTS (SELECT 1 FROM MessageRead r WHERE r.messageId = m.id AND r.userId = :userId) " +
            "ORDER BY m.createdAt ASC")
    List<String> findUnreadMessageIdsByRoom(@Param("roomId") String roomId, @Param("userId") String userId);

    /** Unread count for a room for a user — single indexed aggregate, no full-table scan. */
    @Query("SELECT COUNT(m) FROM Message m WHERE m.roomId = :roomId AND m.senderId <> :userId AND m.hidden = false " +
            "AND NOT EXISTS (SELECT 1 FROM MessageRead r WHERE r.messageId = m.id AND r.userId = :userId)")
    long countUnreadByRoom(@Param("roomId") String roomId, @Param("userId") String userId);

    List<MessageRead> findByMessageIdIn(java.util.Collection<String> messageIds);
}
