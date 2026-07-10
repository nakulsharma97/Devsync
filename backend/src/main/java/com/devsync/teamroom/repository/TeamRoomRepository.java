package com.devsync.teamroom.repository;

import com.devsync.teamroom.entity.TeamRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TeamRoomRepository extends JpaRepository<TeamRoom, String> {
    List<TeamRoom> findByCreatedBy(String createdBy);

    @Query("SELECT r FROM TeamRoom r JOIN TeamRoomParticipant p ON r.id = p.roomId WHERE p.userId = :userId")
    List<TeamRoom> findRoomsByUserId(@Param("userId") String userId);

    @Query("SELECT r FROM TeamRoom r WHERE r.projectId = :projectId")
    List<TeamRoom> findByProjectId(@Param("projectId") String projectId);
}
