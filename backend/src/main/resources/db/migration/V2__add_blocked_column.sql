-- =============================================
-- DevSync Database Schema - V2
-- Adds a blocked flag to users so admins can
-- moderate accounts from the admin panel.
-- =============================================

ALTER TABLE users
    ADD COLUMN blocked BOOLEAN NOT NULL DEFAULT FALSE;
