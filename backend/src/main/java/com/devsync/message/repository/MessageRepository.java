package com.devsync.message.repository;

import com.devsync.message.entity.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, String> {

    List<Message> findByRoomIdOrderByCreatedAtAsc(String roomId, Pageable pageable);

    List<Message> findByRoomIdOrderByCreatedAtAsc(String roomId);

    List<Message> findByRoomIdAndCreatedAtAfter(String roomId, java.time.Instant after);

    @Query("SELECT m FROM Message m WHERE (m.senderId = :userId AND m.receiverId = :otherId) OR (m.senderId = :otherId AND m.receiverId = :userId) ORDER BY m.createdAt ASC")
    List<Message> findConversation(@Param("userId") String userId, @Param("otherId") String otherId, Pageable pageable);

    @Query("SELECT m FROM Message m WHERE m.receiverId = :userId AND m.roomId IS NULL ORDER BY m.createdAt DESC")
    List<Message> findReceivedDMs(@Param("userId") String userId);

    @Query("SELECT DISTINCT m.roomId FROM Message m WHERE m.roomId IS NOT NULL")
    List<String> findDistinctRoomIds();

    @Query("SELECT m FROM Message m WHERE m.senderId = :userId OR m.receiverId = :userId OR m.roomId IN :roomIds ORDER BY m.createdAt DESC")
    List<Message> findRecentMessages(@Param("userId") String userId, @Param("roomIds") List<String> roomIds, Pageable pageable);
}
