package com.devsync.notes.repository;

import com.devsync.notes.entity.ProjectNote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProjectNoteRepository extends JpaRepository<ProjectNote, String> {

    Optional<ProjectNote> findByProjectId(String projectId);
}
