package com.devsync.notes.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class NoteResponse {
    private String projectId;
    private long version;
    /** Base64-encoded Yjs document state; null when the note was never edited. */
    private String yjsState;
    private String updatedBy;
    private Instant updatedAt;
}
