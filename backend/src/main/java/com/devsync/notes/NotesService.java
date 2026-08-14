package com.devsync.notes;

import com.devsync.common.ResourceNotFoundException;
import com.devsync.notes.dto.NoteResponse;
import com.devsync.notes.entity.ProjectNote;
import com.devsync.notes.repository.ProjectNoteRepository;
import com.devsync.project.entity.Project;
import com.devsync.project.repository.ProjectMemberRepository;
import com.devsync.project.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Base64;

/**
 * Per-project shared Markdown document backed by a serialized CRDT (Yjs)
 * binary state. The client holds the live document; the server persists the
 * state with optimistic concurrency (version) and relays incremental updates
 * over STOMP so editors stay in sync in real time.
 */
@Service
@RequiredArgsConstructor
public class NotesService {

    private final ProjectNoteRepository noteRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;

    @Transactional(readOnly = true)
    public NoteResponse getNote(String projectId, String userId) {
        Project project = findActiveProject(projectId);
        requireMember(project, userId);
        return noteRepository.findByProjectId(projectId)
                .map(this::toResponse)
                .orElseGet(() -> NoteResponse.builder()
                        .projectId(projectId).version(0L).yjsState(null).build());
    }

    /**
     * Persists the full CRDT state. A save whose version does not match the
     * stored version is rejected (409) so a stale client cannot clobber newer
     * edits; the client merges from its live Yjs document and retries.
     */
    @Transactional
    public NoteResponse saveNote(String projectId, String userId, long clientVersion, String yjsStateBase64) {
        Project project = findActiveProject(projectId);
        requireMember(project, userId);
        if (yjsStateBase64 == null) {
            throw new IllegalArgumentException("yjsState is required");
        }

        ProjectNote note = noteRepository.findByProjectId(projectId).orElseGet(() -> {
            ProjectNote created = ProjectNote.builder().projectId(projectId).build();
            created.setVersion(0L);
            return created;
        });

        if (clientVersion != note.getVersion()) {
            throw new NoteConflictException(note.getVersion());
        }
        note.setYjsState(Base64.getDecoder().decode(yjsStateBase64));
        note.setVersion(note.getVersion() + 1);
        note.setUpdatedBy(userId);
        noteRepository.save(note);
        return toResponse(note);
    }

    private Project findActiveProject(String projectId) {
        Project project = projectRepository.findById(projectId)
                .filter(p -> !p.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
        if (project.getStatus() == Project.ProjectStatus.ARCHIVED) {
            throw new IllegalArgumentException("Archived projects cannot be edited");
        }
        return project;
    }

    private void requireMember(Project project, String userId) {
        if (project.getOwnerId().equals(userId)) return;
        if (!memberRepository.existsByProjectIdAndUserId(project.getId(), userId)) {
            throw new AccessDeniedException("You are not a member of this project");
        }
    }

    private NoteResponse toResponse(ProjectNote note) {
        return NoteResponse.builder()
                .projectId(note.getProjectId())
                .version(note.getVersion())
                .yjsState(note.getYjsState() == null ? null
                        : Base64.getEncoder().encodeToString(note.getYjsState()))
                .updatedBy(note.getUpdatedBy())
                .updatedAt(note.getUpdatedAt())
                .build();
    }
}
