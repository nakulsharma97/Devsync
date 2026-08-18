package com.devsync.kanban.repository;

import com.devsync.kanban.entity.Task;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    /** The task working on a given feature branch (webhook → task mapping). */
    Optional<Task> findByBranchName(String branchName);

    @Query("SELECT MAX(t.position) FROM Task t WHERE t.columnId = :columnId")
    Optional<Integer> findMaxPositionByColumnId(@Param("columnId") String columnId);

    @Query("SELECT t.boardId, COUNT(t) FROM Task t WHERE t.boardId IN :boardIds GROUP BY t.boardId")
    List<Object[]> countTasksByBoardIdIn(@Param("boardIds") Collection<String> boardIds);

    long countByColumnIdIn(Collection<String> columnIds);

    long countByBoardIdInAndDueDateBefore(Collection<String> boardIds, java.time.Instant dueDate);

    long countByBoardIdInAndColumnIdNotInAndDueDateBefore(Collection<String> boardIds,
                                                          Collection<String> columnIds,
                                                          java.time.Instant dueDate);

    /** Task counts per assignee for a set of boards (null assignees excluded). */
    @Query("SELECT t.assigneeId, COUNT(t) FROM Task t WHERE t.boardId IN :boardIds AND t.assigneeId IS NOT NULL " +
            "GROUP BY t.assigneeId")
    List<Object[]> countGroupedByAssignee(@Param("boardIds") Collection<String> boardIds);

    /** Tasks with a due date inside a range, for calendar views. */
    List<Task> findByDueDateBetweenAndBoardIdInOrderByDueDateAsc(java.time.Instant dueFrom,
                                                                 java.time.Instant dueTo,
                                                                 Collection<String> boardIds);

    /** Unscoped due-date range for platform admins. */
    List<Task> findByDueDateBetweenOrderByDueDateAsc(java.time.Instant dueFrom, java.time.Instant dueTo);

    List<Task> findByBoardIdIn(Collection<String> boardIds);

    long countByBoardIdIn(Collection<String> boardIds);

    /**
     * Tasks sitting in a "done"/"complete" column across the whole platform.
     * Single indexed aggregate — matches how project analytics count completion.
     */
    @Query("SELECT COUNT(t) FROM Task t WHERE EXISTS (SELECT 1 FROM BoardColumn c " +
            "WHERE c.id = t.columnId AND (LOWER(c.name) LIKE '%done%' OR LOWER(c.name) LIKE '%complete%'))")
    long countCompletedTasks();

    List<Task> findTop5ByBoardIdInOrderByUpdatedAtDesc(Collection<String> boardIds);

    @Query("SELECT t FROM Task t WHERE (:keyword IS NULL OR LOWER(t.title) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND t.boardId IN (SELECT b.id FROM Board b WHERE b.projectId IN " +
            "(SELECT pm.projectId FROM ProjectMember pm WHERE pm.userId = :userId))")
    List<Task> searchTasksForUser(@Param("keyword") String keyword, @Param("userId") String userId,
                                  Pageable pageable);

    @Query("SELECT t FROM Task t WHERE t.boardId IN :boardIds " +
            "AND (:priority IS NULL OR t.priority = :priority) " +
            "AND (:label IS NULL OR t.labels LIKE CONCAT('%', :label, '%')) " +
            "AND (:status IS NULL OR t.columnId IN (SELECT c.id FROM BoardColumn c " +
            "   WHERE c.boardId = t.boardId AND LOWER(c.name) LIKE LOWER(CONCAT('%', :status, '%')))) " +
            "AND (:keyword IS NULL OR LOWER(t.title) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Task> findFilteredTasks(@Param("boardIds") Collection<String> boardIds,
                                 @Param("priority") Task.Priority priority,
                                 @Param("label") String label,
                                 @Param("status") String status,
                                 @Param("keyword") String keyword,
                                 Pageable pageable);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.boardId IN :boardIds " +
            "AND (:priority IS NULL OR t.priority = :priority) " +
            "AND (:label IS NULL OR t.labels LIKE CONCAT('%', :label, '%')) " +
            "AND (:status IS NULL OR t.columnId IN (SELECT c.id FROM BoardColumn c " +
            "   WHERE c.boardId = t.boardId AND LOWER(c.name) LIKE LOWER(CONCAT('%', :status, '%')))) " +
            "AND (:keyword IS NULL OR LOWER(t.title) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    long countFilteredTasks(@Param("boardIds") Collection<String> boardIds,
                            @Param("priority") Task.Priority priority,
                            @Param("label") String label,
                            @Param("status") String status,
                            @Param("keyword") String keyword);

}
