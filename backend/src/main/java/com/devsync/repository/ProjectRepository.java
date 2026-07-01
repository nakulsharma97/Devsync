package com.devsync.repository;

import com.devsync.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Query("SELECT p FROM Project p WHERE " +
           "LOWER(p.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.description) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.techStack) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Project> search(@Param("query") String query);

    long countByUserId(Long userId);
}
