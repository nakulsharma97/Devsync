package com.devsync.notes.entity;

import com.devsync.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * A project's shared Markdown document. Stores a serialized Yjs document
 * (base64-encoded binary state) plus an optimistic-concurrency version: a save
 * with a stale version is rejected with 409 and the client merges.
 */
@Entity
@Table(name = "project_notes", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"project_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectNote extends BaseEntity {

    @Column(name = "project_id", nullable = false, unique = true)
    private String projectId;

    /** Yjs document state (binary). NULL = never edited. */
    @Lob
    @Column(name = "yjs_state", columnDefinition = "LONGBLOB")
    private byte[] yjsState;

    @Column(nullable = false)
    @Builder.Default
    private long version = 0;

    @Column(name = "updated_by")
    private String updatedBy;
}
