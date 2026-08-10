package com.devsync.github.repository;

import com.devsync.github.entity.ProjectGitHubLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProjectGitHubLinkRepository extends JpaRepository<ProjectGitHubLink, String> {
    Optional<ProjectGitHubLink> findByProjectId(String projectId);
    Optional<ProjectGitHubLink> findByRepoId(Long repoId);
    boolean existsByProjectId(String projectId);
    boolean existsByRepoId(Long repoId);
    Optional<ProjectGitHubLink> findByRepoFullName(String repoFullName);
    void deleteByProjectId(String projectId);
}
