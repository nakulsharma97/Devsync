-- =============================================
-- DevSync Database Schema - V10
-- Analytics performance: the admin user/project growth
-- series aggregate by created_at ranges. projects was
-- missing a created_at index (users/activities/reports
-- already have one from V6/V9).
-- =============================================

ALTER TABLE projects
    ADD INDEX idx_projects_created_at (created_at);
