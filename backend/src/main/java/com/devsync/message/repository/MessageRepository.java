package com.devsync.message.repository;

import com.devsync.message.entity.Message;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, String> {

    List<Message> findByRoomIdOrderByCreatedAtAsc(String roomId, Pageable pageable);

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

    List<Message> findTop5ByRoomIdInOrderByCreatedAtDesc(Collection<String> roomIds);

    @Query("SELECT m FROM Message m WHERE (:keyword IS NULL OR LOWER(m.content) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND (m.senderId = :userId OR m.receiverId = :userId OR " +
            "m.roomId IN (SELECT tp.roomId FROM TeamRoomParticipant tp WHERE tp.userId = :userId))")
    List<Message> searchMessagesForUser(@Param("keyword") String keyword, @Param("userId") String userId,
                                        Pageable pageable);

}
