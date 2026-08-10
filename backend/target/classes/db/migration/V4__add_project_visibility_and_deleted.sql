-- =============================================
-- DevSync Database Schema - V4
-- Admin Project Management support:
-- adds visibility (PUBLIC/PRIVATE) and soft-delete
-- columns to the projects table.
-- =============================================

ALTER TABLE projects
    ADD COLUMN visibility VARCHAR(20) NOT NULL DEFAULT 'PUBLIC',
    ADD COLUMN deleted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN deleted_at DATETIME(6) NULL;
