package com.devsync.kanban.repository;

import com.devsync.kanban.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaskRepository extends JpaRepository<Task, String> {
    List<Task> findByColumnIdOrderByPositionAsc(String columnId);
    List<Task> findByBoardIdOrderByPositionAsc(String boardId);
    List<Task> findByAssigneeId(String assigneeId);
}
