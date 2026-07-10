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
}
