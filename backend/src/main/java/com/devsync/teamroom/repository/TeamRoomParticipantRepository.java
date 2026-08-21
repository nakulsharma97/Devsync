package com.devsync.teamroom.repository;

import com.devsync.teamroom.entity.TeamRoomParticipant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TeamRoomParticipantRepository extends JpaRepository<TeamRoomParticipant, String> {
    List<TeamRoomParticipant> findByRoomId(String roomId);
    List<TeamRoomParticipant> findByUserId(String userId);
    Optional<TeamRoomParticipant> findByRoomIdAndUserId(String roomId, String userId);
    boolean existsByRoomIdAndUserId(String roomId, String userId);
    long countByRoomId(String roomId);

    /** (roomId, COUNT) — participant count per room for a batch of rooms. */
    @org.springframework.data.jpa.repository.Query(
        "SELECT p.roomId, COUNT(p) FROM TeamRoomParticipant p WHERE p.roomId IN :roomIds GROUP BY p.roomId")
    java.util.List<Object[]> countByRoomIdInGrouped(@org.springframework.data.repository.query.Param("roomIds") java.util.Collection<String> roomIds);
}
