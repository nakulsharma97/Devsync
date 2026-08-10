-- =============================================
-- DevSync Database Schema - V3
-- Adds soft-delete flags to users so admins can
-- remove accounts without losing related data.
-- =============================================

ALTER TABLE users
    ADD COLUMN deleted BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users
    ADD COLUMN deleted_at TIMESTAMP NULL;
