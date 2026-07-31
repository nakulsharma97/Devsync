package com.devsync.kanban.repository;

import com.devsync.kanban.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface TaskRepository extends JpaRepository<Task, String> {
    List<Task> findByColumnIdOrderByPositionAsc(String columnId);

    @Query("SELECT MAX(t.position) FROM Task t WHERE t.columnId = :columnId")
    Optional<Integer> findMaxPositionByColumnId(@Param("columnId") String columnId);

    @Query("SELECT t.boardId, COUNT(t) FROM Task t WHERE t.boardId IN :boardIds GROUP BY t.boardId")
    List<Object[]> countTasksByBoardIdIn(@Param("boardIds") Collection<String> boardIds);

    List<Task> findByBoardIdIn(Collection<String> boardIds);

    List<Task> findTop5ByBoardIdInOrderByUpdatedAtDesc(Collection<String> boardIds);
}
