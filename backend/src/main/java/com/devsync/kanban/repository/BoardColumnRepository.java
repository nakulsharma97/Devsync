package com.devsync.kanban.repository;

import com.devsync.kanban.entity.BoardColumn;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BoardColumnRepository extends JpaRepository<BoardColumn, String> {
    List<BoardColumn> findByBoardIdOrderByPositionAsc(String boardId);
}
