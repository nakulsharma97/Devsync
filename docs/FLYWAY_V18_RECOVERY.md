# Flyway V18 recovery runbook (Render + Aiven MySQL)

This runbook recovers the production database after the V18 migration
(`V18__enforce_single_team_chat_per_project.sql`) failed and Flyway
validation blocks application startup:

```text
FlywayValidateException: Validate failed: Migrations have failed validation.
Detected failed migration to version 18 (enforce single team chat per project).
```

It never drops, resets, or recreates anything. The only schema-history change is
running Flyway **repair**, which (verified locally against Flyway 10.20.1 /
MySQL 8.0.46):

- **deletes history rows with `success = 0`** — i.e. the failed V18 entry. That
  is the row validation is complaining about.
- **rewrites the stored checksum (and description) of applied (`success = 1`)
  rows when their local file changed.** In this recovery that is a no-op: no
  applied file (V1–V17) was modified.
- It does **not** execute any migration SQL, modify or drop tables, delete
  data, or reset migration history. It only edits `flyway_schema_history`.

Because MySQL DDL auto-commits, the failed V18 may have **partially applied**:
in local reproduction the dedup steps committed and only the final
`ALTER TABLE` failed. The rewritten V18 is designed to succeed and converge in
every one of those states — see the state matrix in step 3 — so no manual data
surgery is required.

---

## Step 1 — Read-only diagnostics on the Aiven database

Run these against the Aiven MySQL instance (Aiven console → *Console* tab, or
`mysql` client with the service's CA). Nothing here writes.

```sql
-- 1. Server version (informational; the new V18 works on 5.7+, 8.x, MariaDB)
SELECT VERSION();

-- 2. Migration history: expect V1..V17 success=1 and V18 success=0,
--    with nothing after 18.
SELECT installed_rank, version, description, script, checksum, success
FROM flyway_schema_history
ORDER BY installed_rank;

-- 3. Current indexes on team_rooms
SELECT index_name, non_unique, GROUP_CONCAT(column_name ORDER BY seq_in_index) cols
FROM information_schema.statistics
WHERE table_schema = DATABASE() AND table_name = 'team_rooms'
GROUP BY index_name, non_unique;

-- 4. Duplicate team chats per project (expected: some, that's why V18 exists)
SELECT project_id, COUNT(*) AS rooms
FROM team_rooms
WHERE project_id IS NOT NULL
GROUP BY project_id HAVING rooms > 1;

-- 5. Pre-migration row counts — compare after recovery to prove nothing lost
SELECT (SELECT COUNT(*) FROM messages)               AS messages,
       (SELECT COUNT(*) FROM team_room_participants) AS participants,
       (SELECT COUNT(*) FROM team_rooms)             AS rooms;
```

How to read the results (this pins the exact root cause):

| Observation | Root cause of the V18 failure |
|---|---|
| `idx_rooms_project_id` missing from step 3 | `1091 Can't DROP 'idx_rooms_project_id'` — the final `ALTER TABLE` failed because the legacy index does not exist on this schema. **Reproduced and verified locally.** |
| `uk_team_rooms_project` already present in step 3 | `1061 Duplicate key name 'uk_team_rooms_project'` — an earlier partial/manual fix already created the unique index. **Reproduced and verified locally.** |
| Neither index present, or an index on `project_id` under yet another name | Pull the original error from Render logs (Deploy → Logs, filter the failed deploy): search for `Migration V18` and the `Error Code:` line. |
| Error in logs mentions syntax near `OVER` | Server < 8.0. The rewritten V18 has no window functions, so this is fixed regardless. |

Also confirm from step 2 that **no version after 18 was applied**. If you
somehow see V19+ applied after a failed V18 (out-of-order migrations), stop and
re-run this runbook's decision matrix before repairing.

## Step 2 — Backup before any change

- Aiven console → your service → **Backups**: confirm a recent automatic
  backup exists (taken daily; the service page shows restore points). A restore
  from here is the rollback path.
- Optional belt-and-braces dump (run locally; password prompted, never inline):

```bash
mysqldump --single-transaction --routines --events \
  --ssl-ca=aiven-ca.pem -h AIVEN_HOST -P AIVEN_PORT -u avnadmin -p \
  DEVSYNC_DB > devsync-backup-$(date +%Y%m%d).sql
```

## Step 3 — Why no manual data fix is needed (state matrix)

The rewritten V18 converges from every state the failed run can leave behind.
Each row below was executed and verified against real MySQL 8.0.46:

| Starting state | New V18 behaviour |
|---|---|
| Duplicates present, legacy index present, unique absent (clean first run) | Dedup + merge + drop legacy + add unique → OK |
| Duplicates already merged/deleted by the failed run (partial apply), legacy index still present | Dedup steps no-op, index swap succeeds → OK |
| Legacy index missing (the 1091 state) | Index swap skips the DROP, adds unique → OK |
| Unique index already present, legacy present (the 1061 state) | Drops legacy, skips the ADD → OK |
| Unique already present, legacy missing | Both index steps no-op → OK |
| Second run over an already-recovered schema | Fully idempotent, 0 statements change data |

Data safety, verified by assertion on every scenario: **no message row and no
participant row is deleted** — messages are moved to the kept (earliest) room,
participant memberships are merged (`INSERT IGNORE`, keyed by the existing
`uk_room_participant` constraint), and only then are the empty duplicate room
rows deleted. Rooms with `project_id IS NULL` are untouched. A MySQL unique
index allows multiple NULLs, so non-project rooms are unaffected by the new
index.

Known cosmetic artefact (same as the original V18): participant rows belonging
to deleted duplicate rooms remain as orphans (no foreign keys exist in this
schema). Every read joins `team_rooms`, so they are invisible to the app and
never affect counts; delete them later with:

```sql
DELETE p FROM team_room_participants p
LEFT JOIN team_rooms r ON r.id = p.room_id
WHERE r.id IS NULL;
```

## Step 4 — Run Flyway repair (once)

The app image has no Flyway CLI, so run repair from your machine against Aiven.
Use a Flyway CLI matching the app's Flyway version (10.20.x) and the repo's
migration folder:

```bash
# download https://repo1.maven.org/maven2/org/flywaydb/flyway-commandline/10.20.1/
cd flyway-10.20.1
./flyway repair \
  -url="jdbc:mysql://AIVEN_HOST:AIVEN_PORT/DEVSYNC_DB?sslMode=VERIFY_IDENTITY&trustCertificateKeyStoreUrl=file:/path/to/aiven-ca.p12&trustCertificateKeyStorePassword=changeit" \
  -user=avnadmin \
  -locations="filesystem:/path/to/repo/backend/src/main/resources/db/migration"
```

(Adjust TLS flags to how you connect; `-user`/`-password` via prompt or env
`FLYWAY_PASSWORD` — never commit either.)

Expected outcome: repair reports it removed the failed migration entry for
version 18. `SELECT ... FROM flyway_schema_history WHERE version = '18'` then
returns **zero rows**. V1–V17 rows are untouched.

## Step 5 — Redeploy on Render

No Render or `deploy/start.sh` change is required. Push the branch with the
rewritten V18 and let Render rebuild (or click *Manual Deploy*). On boot the
backend runs `flyway migrate`; the deploy log must show, in order:

```text
Migrating schema `DEVSYNC_DB` to version "18 - enforce single team chat per project"
Migrating schema `DEVSYNC_DB` to version "19 - backfill team chat participants"
...
Successfully applied 12 migrations to schema `DEVSYNC_DB`
```

followed by Spring starting JPA (`entityManagerFactory` initializes) and
`/api/health` returning 200.

## Step 6 — Post-recovery verification (read-only)

```sql
-- All migrations through V29 applied
SELECT version, success FROM flyway_schema_history
WHERE success = 0 OR version >= '18' ORDER BY installed_rank;

-- Invariant in place: exactly one index on project_id and it is UNIQUE
SELECT index_name, non_unique FROM information_schema.statistics
WHERE table_schema = DATABASE() AND table_name = 'team_rooms';

-- No project has more than one team chat
SELECT project_id, COUNT(*) FROM team_rooms
WHERE project_id IS NOT NULL GROUP BY project_id HAVING COUNT(*) > 1;

-- Nothing lost vs the step-1 counts (messages/participants >= pre-counts;
-- participants can grow: V19 backfills project members into the room)
SELECT (SELECT COUNT(*) FROM messages)               AS messages,
       (SELECT COUNT(*) FROM team_room_participants) AS participants,
       (SELECT COUNT(*) FROM team_rooms)             AS rooms;
```

Behavioural check: opening a project workspace creates/finds its single team
chat, and a second `POST /api/rooms` for the same project is rejected (the
database would also reject it with duplicate-key on
`uk_team_rooms_project`).

## Notes on the other warning

The nginx log-permission warning Render shows (`open() "/var/log/nginx/error.log"
failed (13: Permission denied)`) is unrelated: the container runs nginx as the
non-root `app` user. It does not affect startup, the proxy, or Flyway. Treat it
separately.
