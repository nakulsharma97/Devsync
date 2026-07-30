package com.devsync.project.repository;

import com.devsync.project.entity.ProjectMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProjectMemberRepository extends JpaRepository<ProjectMember, String> {
    List<ProjectMember> findByProjectId(String projectId);
    List<ProjectMember> findByUserId(String userId);
    Optional<ProjectMember> findByProjectIdAndUserId(String projectId, String userId);
    boolean existsByProjectIdAndUserId(String projectId, String userId);
    long countByProjectId(String projectId);

    @Query("SELECT DISTINCT m.projectId FROM ProjectMember m WHERE m.userId = :userId")
    List<String> findProjectIdsByUserId(@Param("userId") String userId);
}
