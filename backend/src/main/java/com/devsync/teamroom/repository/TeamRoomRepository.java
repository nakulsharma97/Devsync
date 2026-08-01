package com.devsync.teamroom.repository;

import com.devsync.teamroom.entity.TeamRoom;
import org.springframework.data.domain.Pageable;
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

    @Query("SELECT r FROM TeamRoom r WHERE (:keyword IS NULL OR LOWER(r.name) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND EXISTS (SELECT 1 FROM TeamRoomParticipant tp WHERE tp.roomId = r.id AND tp.userId = :userId)")
    List<TeamRoom> searchRoomsForUser(@Param("keyword") String keyword, @Param("userId") String userId,
                                      Pageable pageable);

}
