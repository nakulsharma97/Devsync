-- =============================================================
-- DevSync Database Schema - V19
-- Backfill team-chat membership for projects created before V18
-- auto-synced participants:
--   1. Every project member joins their project's team chat
--      (INSERT IGNORE keeps the operation idempotent).
--   2. Remove stale participants of project rooms who are no longer
--      project members, so removed members lose chat access even for
--      pre-V18 rooms.
-- =============================================================

-- Add every current project member to their project's team chat.
INSERT IGNORE INTO team_room_participants (id, room_id, user_id, invited_by, created_at, updated_at)
SELECT UUID(), r.id, pm.user_id, NULL, NOW(6), NOW(6)
FROM team_rooms r
JOIN project_members pm ON pm.project_id = r.project_id
WHERE r.project_id IS NOT NULL;

-- Remove participants of project rooms who are no longer project members.
DELETE p FROM team_room_participants p
JOIN team_rooms r ON r.id = p.room_id AND r.project_id IS NOT NULL
LEFT JOIN project_members pm ON pm.project_id = r.project_id AND pm.user_id = p.user_id
WHERE pm.id IS NULL;
