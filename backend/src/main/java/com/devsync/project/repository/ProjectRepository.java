package com.devsync.project.repository;

import com.devsync.project.entity.Project;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, String> {
    List<Project> findByOwnerId(String ownerId);

    @Query("SELECT p FROM Project p JOIN ProjectMember pm ON p.id = pm.projectId WHERE pm.userId = :userId")
    List<Project> findProjectsByUserId(@Param("userId") String userId);

    List<Project> findTop5ByOrderByCreatedAtDesc();

    List<Project> findTop5ByOrderByCreatedAtDescAndDeletedFalse();

    long countByDeletedFalse();

    long countByStatusAndDeletedFalse(Project.ProjectStatus status);

    long countByVisibilityAndDeletedFalse(Project.ProjectVisibility visibility);

    @Query("SELECT p FROM Project p JOIN User u ON p.ownerId = u.id WHERE p.deleted = :deleted AND " +
            "(:search IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))) " +
            "AND (:visibility IS NULL OR p.visibility = :visibility) " +
            "AND (:status IS NULL OR p.status = :status)")
    Page<Project> searchAdminProjects(@Param("search") String search,
                                      @Param("visibility") Project.ProjectVisibility visibility,
                                      @Param("status") Project.ProjectStatus status,
                                      @Param("deleted") boolean deleted,
                                      Pageable pageable);
}
