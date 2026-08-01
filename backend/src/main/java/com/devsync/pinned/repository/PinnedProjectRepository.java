package com.devsync.pinned.repository;

import com.devsync.pinned.entity.PinnedProject;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PinnedProjectRepository extends JpaRepository<PinnedProject, String> {

    List<PinnedProject> findByUserIdOrderByPositionAsc(String userId);

    Optional<PinnedProject> findByUserIdAndProjectId(String userId, String projectId);

    boolean existsByUserIdAndProjectId(String userId, String projectId);

    long countByUserId(String userId);

    void deleteByUserIdAndProjectId(String userId, String projectId);
}
