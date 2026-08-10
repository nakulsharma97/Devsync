package com.devsync.github.entity;

import com.devsync.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Links a DevSync project to exactly one GitHub repository. Only metadata is
 * stored — never tokens.
 */
@Entity
@Table(name = "project_github_links")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectGitHubLink extends BaseEntity {

    @Column(name = "project_id", nullable = false, unique = true)
    private String projectId;

    @Column(name = "repo_id", nullable = false, unique = true)
    private Long repoId;

    @Column(name = "repo_full_name", nullable = false)
    private String repoFullName;

    @Column(name = "repo_url", nullable = false)
    private String repoUrl;

    @Column(name = "repo_description")
    private String repoDescription;

    @Column(name = "repo_visibility")
    private String repoVisibility;

    @Column(name = "repo_language")
    private String repoLanguage;

    @Column(name = "repo_default_branch")
    private String repoDefaultBranch;

    @Column(name = "linked_by", nullable = false)
    private String linkedBy;

    @Column(name = "linked_at", nullable = false)
    private Instant linkedAt;
}
