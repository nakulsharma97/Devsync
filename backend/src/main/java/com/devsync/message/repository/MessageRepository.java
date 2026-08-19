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

    @Query("SELECT m FROM Message m WHERE (:keyword IS NULL OR LOWER(m.content) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND (m.senderId = :userId OR m.receiverId = :userId OR " +
            "m.roomId IN (SELECT tp.roomId FROM TeamRoomParticipant tp WHERE tp.userId = :userId))")
    List<Message> searchMessagesForUser(@Param("keyword") String keyword, @Param("userId") String userId,
                                        Pageable pageable);

}
