package com.devsync.project.repository;

import com.devsync.project.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, String> {
    List<Project> findByOwnerId(String ownerId);

    @Query("SELECT p FROM Project p JOIN ProjectMember pm ON p.id = pm.projectId WHERE pm.userId = :userId")
    List<Project> findProjectsByUserId(@Param("userId") String userId);
}
