package com.devsync.kanban.repository;

import com.devsync.kanban.entity.Board;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BoardRepository extends JpaRepository<Board, String> {
    List<Board> findByProjectId(String projectId);
}
