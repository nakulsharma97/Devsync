-- =============================================
-- DevSync - V9 Admin User Filter Indexes
-- =============================================
-- The admin user list is filtered by role/status (deleted, blocked) and
-- sorted by created_at / last_login_at. These indexes keep those queries
-- on the index instead of scanning the users table.
-- =============================================

CREATE INDEX idx_users_role_deleted_blocked ON users (role, deleted, blocked);
CREATE INDEX idx_users_created_at ON users (created_at);
CREATE INDEX idx_users_last_login_at ON users (last_login_at);
