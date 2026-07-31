package com.devsync.report;

/**
 * Moderation actions an admin can take directly from a report.
 * Each action is only valid for the matching ReportEntityType.
 */
public enum ModerationAction {
    // USER
    BLOCK_USER,
    UNBLOCK_USER,
    DELETE_USER,
    // PROJECT
    ARCHIVE_PROJECT,
    DELETE_PROJECT,
    SET_VISIBILITY,
    // POST
    DELETE_POST,
    HIDE_POST,
    RESTORE_POST,
    // COMMENT
    DELETE_COMMENT,
    RESTORE_COMMENT,
    // MESSAGE
    DELETE_MESSAGE,
    HIDE_MESSAGE
}
