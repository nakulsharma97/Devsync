package com.devsync.message.repository;

import com.devsync.message.entity.Message;
import com.devsync.message.entity.MessageStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, String> {

    List<Message> findByRoomIdOrderByCreatedAtAsc(String roomId, Pageable pageable);

    List<Message> findByRoomIdOrderByCreatedAtDesc(String roomId, Pageable pageable);

    /** Load messages older than the given cursor (for scroll-up pagination). */
    List<Message> findByRoomIdAndIdLessThanOrderByCreatedAtDesc(String roomId, String cursorId, Pageable pageable);

    List<Message> findByAttachmentId(String attachmentId);

    List<Message> findByRoomIdAndCreatedAtAfter(String roomId, java.time.Instant after);

    @Query("SELECT m FROM Message m WHERE (m.senderId = :userId AND m.receiverId = :otherId) OR (m.senderId = :otherId AND m.receiverId = :userId) ORDER BY m.createdAt ASC")
    List<Message> findConversation(@Param("userId") String userId, @Param("otherId") String otherId, Pageable pageable);

    @Query("SELECT DISTINCT CASE WHEN m.senderId = :userId THEN m.receiverId ELSE m.senderId END FROM Message m WHERE (m.senderId = :userId OR m.receiverId = :userId) AND m.roomId IS NULL")
    List<String> findDmPartnerIds(@Param("userId") String userId);

    @Query("SELECT m FROM Message m WHERE m.senderId = :userId OR m.receiverId = :userId OR m.roomId IN :roomIds ORDER BY m.createdAt DESC")
    List<Message> findRecentMessages(@Param("userId") String userId, @Param("roomIds") List<String> roomIds, Pageable pageable);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.senderId = :userId OR m.receiverId = :userId")
    long countMessagesByUserId(@Param("userId") String userId);

    long countByRoomIdIn(Collection<String> roomIds);

    long countBySenderIdAndReceiverIdAndStatusNotAndHiddenFalse(
            String senderId, String receiverId, MessageStatus status);

    /** Unread direct messages inbound to the user (excluding their own / hidden). */
    long countBySenderIdNotAndReceiverIdAndStatusNotAndHiddenFalse(
            String senderId, String receiverId, MessageStatus status);

    @Modifying
    @Query("UPDATE Message m SET m.status = :status, m.readAt = :now " +
            "WHERE m.senderId = :senderId AND m.receiverId = :receiverId AND m.status <> :status")
    int markDirectRead(@Param("senderId") String senderId,
                       @Param("receiverId") String receiverId,
                       @Param("status") MessageStatus status,
                       @Param("now") Instant now);

    @Modifying
    @Query("UPDATE Message m SET m.status = :delivered WHERE m.id = :id AND m.status = :sent")
    int markDelivered(@Param("id") String id,
                      @Param("delivered") MessageStatus delivered,
                      @Param("sent") MessageStatus sent);

    List<Message> findTop5ByRoomIdInOrderByCreatedAtDesc(Collection<String> roomIds);

    List<Message> findByParentMessageIdOrderByCreatedAtAsc(String parentMessageId);

    @Query("SELECT m.parentMessageId, COUNT(m) FROM Message m WHERE m.parentMessageId IN :parentIds GROUP BY m.parentMessageId")
    List<Object[]> countByParentMessageIdIn(@Param("parentIds") Collection<String> parentIds);

    long countByParentMessageId(String parentMessageId);

    /**
     * Fetch the single most-recent message per room for a batch of room ids.
     * Returns (roomId, content, createdAt) for each room that has at least one message.
     */
    @Query(value = "SELECT m.room_id, m.content, m.created_at FROM messages m " +
            "INNER JOIN (SELECT room_id, MAX(created_at) AS max_ts FROM messages " +
            "WHERE room_id IN :roomIds AND hidden = false GROUP BY room_id) latest " +
            "ON m.room_id = latest.room_id AND m.created_at = latest.max_ts",
            nativeQuery = true)
    List<Object[]> findLatestByRoomIds(@Param("roomIds") Collection<String> roomIds);

    /**
     * Fetch the single most-recent DM message for each of the given partner ids
     * relative to a user. Returns (partnerId, content, createdAt).
     */
    @Query(value = "SELECT sub.partner_id, sub.content, sub.created_at FROM (" +
            "  SELECT CASE WHEN m.sender_id = :userId THEN m.receiver_id ELSE m.sender_id END AS partner_id, " +
            "         m.content, m.created_at, " +
            "         ROW_NUMBER() OVER (PARTITION BY CASE WHEN m.sender_id = :userId THEN m.receiver_id ELSE m.sender_id END ORDER BY m.created_at DESC) AS rn " +
            "  FROM messages m WHERE m.room_id IS NULL AND m.hidden = false " +
            "  AND (m.sender_id = :userId OR m.receiver_id = :userId)" +
            ") sub WHERE sub.rn = 1 AND sub.partner_id IN :partnerIds",
            nativeQuery = true)
    List<Object[]> findLatestDmByPartnerIds(@Param("userId") String userId,
                                           @Param("partnerIds") Collection<String> partnerIds);

    @Query("SELECT m FROM Message m WHERE (:keyword IS NULL OR LOWER(m.content) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND (m.senderId = :userId OR m.receiverId = :userId OR " +
            "m.roomId IN (SELECT tp.roomId FROM TeamRoomParticipant tp WHERE tp.userId = :userId))")
    List<Message> searchMessagesForUser(@Param("keyword") String keyword, @Param("userId") String userId,
                                        Pageable pageable);

}
