package com.devsync.teamroom.repository;

import com.devsync.teamroom.entity.TeamRoom;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TeamRoomRepository extends JpaRepository<TeamRoom, String> {
    List<TeamRoom> findByCreatedBy(String createdBy);

    @Query("SELECT r FROM TeamRoom r JOIN TeamRoomParticipant p ON r.id = p.roomId WHERE p.userId = :userId")
    List<TeamRoom> findRoomsByUserId(@Param("userId") String userId);

    @Query("SELECT r FROM TeamRoom r WHERE r.projectId = :projectId")
    List<TeamRoom> findByProjectId(@Param("projectId") String projectId);

    /**
     * The project's team chat. This is a DERIVED query so Spring Data applies
     * "First" semantics (LIMIT 1): a custom @Query here would return every
     * matching row and blow up with IncorrectResultSizeDataAccessException as
     * soon as duplicates exist. The V18 unique index makes duplicates
     * impossible going forward; the LIMIT 1 remains as defense in depth.
     */
    Optional<TeamRoom> findFirstByProjectIdOrderByCreatedAtAsc(String projectId);

    @Query("SELECT r FROM TeamRoom r WHERE (:keyword IS NULL OR LOWER(r.name) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND EXISTS (SELECT 1 FROM TeamRoomParticipant tp WHERE tp.roomId = r.id AND tp.userId = :userId)")
    List<TeamRoom> searchRoomsForUser(@Param("keyword") String keyword, @Param("userId") String userId,
                                      Pageable pageable);

}
