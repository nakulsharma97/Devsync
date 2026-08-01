package com.devsync.project.repository;

import com.devsync.project.entity.Project;
import java.time.Instant;
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

    List<Project> findTop5ByDeletedFalseOrderByCreatedAtDesc();

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

    @Query("SELECT p FROM Project p WHERE p.deleted = false AND p.status = :status " +
            "AND p.visibility = :visibility " +
            "AND (:search IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(p.description) LIKE LOWER(CONCAT('%', :search, '%'))) " +
            "ORDER BY p.createdAt DESC")
    List<Project> discoverPublicProjects(@Param("status") Project.ProjectStatus status,
                                         @Param("visibility") Project.ProjectVisibility visibility,
                                         @Param("search") String search,
                                         Pageable pageable);

    @Query("SELECT p FROM Project p WHERE p.deleted = false AND " +
            "(p.visibility = :visibility OR p.ownerId = :userId OR " +
            "EXISTS (SELECT 1 FROM ProjectMember pm WHERE pm.projectId = p.id AND pm.userId = :userId)) " +
            "AND (:keyword IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "OR LOWER(p.description) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    List<Project> searchProjectsForUser(@Param("keyword") String keyword,
                                        @Param("userId") String userId,
                                        @Param("visibility") Project.ProjectVisibility visibility,
                                        Pageable pageable);

    long countByOwnerId(String ownerId);

    long countByCreatedAtBetween(Instant from, Instant to);

}
