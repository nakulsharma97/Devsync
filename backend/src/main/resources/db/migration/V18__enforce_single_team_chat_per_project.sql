-- =============================================================
-- DevSync Database Schema - V18
-- Guarantee ONE team chat per project.
--
-- History: the first version of this script failed in production
-- (Flyway marked V18 failed), most likely at its final ALTER TABLE:
-- either 1091 "Can't DROP 'idx_rooms_project_id'" (that index does
-- not exist on the target schema) or 1061 "Duplicate key name
-- 'uk_team_rooms_project'" (a previous partial/manual fix already
-- created it). Because MySQL DDL auto-commits, the dedup steps
-- above the ALTER may already have been committed before the
-- failure - so every statement below is safe to re-run in any
-- partially-applied state.
--
-- What it does:
--   1. Deduplicate existing team_rooms (keep the earliest room per
--      project, reassign its participants + messages, drop the
--      duplicate rooms). No message or participant row is deleted.
--   2. Ensure exactly one UNIQUE index named uk_team_rooms_project
--      on team_rooms.project_id, dropping the redundant
--      idx_rooms_project_id only if it exists. MySQL unique indexes
--      allow multiple NULLs, so rooms not tied to a project are
--      unaffected.
--
-- Compatibility: no window functions and no index IF EXISTS - runs
-- on MySQL 5.7+, 8.x and MariaDB 10.x. Conditional index handling
-- uses information_schema + PREPARE, which Flyway's plain-SQL
-- parser executes fine (no stored routines, no DELIMITER).
-- =============================================================

-- 0) Re-runnable temp workspace (a previous attempt on the same
--    connection could have left it behind).
DROP TEMPORARY TABLE IF EXISTS tmp_room_keep;

-- 1) Keep-set: the earliest room per project (created_at, with id as
--    a deterministic tiebreak; id is unique, so exactly one room per
--    project survives). Self LEFT JOIN instead of ROW_NUMBER() for
--    old-server compatibility; the comparison uses the column
--    collation, matching unique-index equality semantics.
CREATE TEMPORARY TABLE tmp_room_keep AS
SELECT o.project_id, o.id AS keep_id
FROM team_rooms o
LEFT JOIN team_rooms e
       ON e.project_id = o.project_id
      AND (e.created_at < o.created_at
           OR (e.created_at = o.created_at AND e.id < o.id))
WHERE o.project_id IS NOT NULL
  AND e.id IS NULL;

-- 2) Reassign participants from duplicate rooms to the kept room
--    (idempotent: uk_room_participant makes repeats no-ops).
INSERT IGNORE INTO team_room_participants (id, room_id, user_id, invited_by, created_at, updated_at)
SELECT UUID(), k.keep_id, p.user_id, p.invited_by, p.created_at, p.updated_at
FROM team_room_participants p
JOIN team_rooms d ON d.id = p.room_id
JOIN tmp_room_keep k ON k.project_id = d.project_id
WHERE d.id <> k.keep_id;

-- 3) Reassign messages from duplicate rooms to the kept room -
--    messages are moved, never deleted.
UPDATE messages m
JOIN team_rooms d ON d.id = m.room_id
JOIN tmp_room_keep k ON k.project_id = d.project_id
SET m.room_id = k.keep_id
WHERE d.id <> k.keep_id;

-- 4) Delete the now-empty duplicate rooms. The keep-set is one row
--    per project, so every duplicate joins exactly once.
DELETE d FROM team_rooms d
JOIN tmp_room_keep k ON k.project_id = d.project_id
WHERE d.id <> k.keep_id;

DROP TEMPORARY TABLE IF EXISTS tmp_room_keep;

-- 5) Enforce the invariant going forward. Each step runs only when
--    needed, so the script succeeds on a fresh schema, on one where
--    the legacy index is missing, and on one where a previous
--    partial fix already created the unique index.

-- 5a) Drop the redundant non-unique index if it still exists.
SET @ddl = (SELECT IF(COUNT(*) > 0,
                      'ALTER TABLE team_rooms DROP INDEX idx_rooms_project_id',
                      'SELECT 1')
            FROM information_schema.statistics
            WHERE table_schema = DATABASE()
              AND table_name = 'team_rooms'
              AND index_name = 'idx_rooms_project_id');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5b) Add the unique index (at most one team chat per project)
--     unless that index name already exists. Fails loudly if
--     duplicates somehow remain.
SET @ddl = (SELECT IF(COUNT(*) > 0,
                      'SELECT 1',
                      'ALTER TABLE team_rooms ADD UNIQUE INDEX uk_team_rooms_project (project_id)')
            FROM information_schema.statistics
            WHERE table_schema = DATABASE()
              AND table_name = 'team_rooms'
              AND index_name = 'uk_team_rooms_project');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;