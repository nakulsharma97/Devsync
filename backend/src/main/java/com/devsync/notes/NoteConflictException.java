package com.devsync.notes;

/**
 * Raised when a note save carries a stale version. Carries the server's
 * current version so the client can merge and retry.
 */
public class NoteConflictException extends RuntimeException {
    private final long currentVersion;

    public NoteConflictException(long currentVersion) {
        super("The note was updated by someone else — please merge and retry");
        this.currentVersion = currentVersion;
    }

    public long getCurrentVersion() {
        return currentVersion;
    }
}
