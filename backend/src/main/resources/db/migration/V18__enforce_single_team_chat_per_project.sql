-- =============================================================
-- DevSync Database Schema - V18
-- Guarantee ONE team chat per project:
--   1. Deduplicate existing team_rooms (keep the earliest room per
--      project, reassign its participants + messages, drop duplicates).
--   2. Add a UNIQUE index on team_rooms.project_id so a project can
--      never have a second team chat. MySQL unique indexes allow
--      multiple NULLs, so rooms not tied to a project are unaffected.
--
-- NOTE: MySQL cannot reference the same TEMPORARY table twice in one
-- statement ("Can't reopen table"), so each statement below references
-- the temp table exactly once.
-- =============================================================

-- Rank rooms per project: rn = 1 is the room to keep (earliest
-- created_at; id is a deterministic tiebreak for identical timestamps).
CREATE TEMPORARY TABLE tmp_room_keep AS
SELECT project_id, keep_id
FROM (
    SELECT project_id,
           id AS keep_id,
           ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at ASC, id ASC) AS rn
    FROM team_rooms
    WHERE project_id IS NOT NULL
) ranked
WHERE rn = 1;

-- Reassign participants from duplicate rooms to the kept room (idempotent).
INSERT IGNORE INTO team_room_participants (id, room_id, user_id, invited_by, created_at, updated_at)
SELECT UUID(), k.keep_id, p.user_id, p.invited_by, p.created_at, p.updated_at
FROM team_room_participants p
JOIN team_rooms d ON d.id = p.room_id
JOIN tmp_room_keep k ON k.project_id = d.project_id
WHERE d.id <> k.keep_id;

-- Reassign messages from duplicate rooms to the kept room.
UPDATE messages m
JOIN team_rooms d ON d.id = m.room_id
JOIN tmp_room_keep k ON k.project_id = d.project_id
SET m.room_id = k.keep_id
WHERE d.id <> k.keep_id;

-- Delete the now-empty duplicate rooms.
DELETE d FROM team_rooms d
JOIN tmp_room_keep k ON k.project_id = d.project_id
WHERE d.id <> k.keep_id;

DROP TEMPORARY TABLE tmp_room_keep;

-- Enforce the invariant going forward: one team chat per project.
ALTER TABLE team_rooms
    DROP INDEX idx_rooms_project_id,
    ADD UNIQUE INDEX uk_team_rooms_project (project_id);
