package com.devsync.github.repository;

import com.devsync.github.entity.GitHubConnection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GitHubConnectionRepository extends JpaRepository<GitHubConnection, String> {
    Optional<GitHubConnection> findByUserId(String userId);
    Optional<GitHubConnection> findByGithubUsername(String githubUsername);
    boolean existsByUserId(String userId);
    void deleteByUserId(String userId);
}
