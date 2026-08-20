#!/usr/bin/env bash
# ============================================================
# DevSync Backup Restore Test Script
# Usage: ./scripts/restore-test.sh <backup-file>
#
# Restores a backup into an isolated test database, verifies
# schema and data integrity, then cleans up.
#
# NEVER runs against production — uses a dedicated test database.
# ============================================================
set -euo pipefail

BACKUP_FILE="${1:?Usage: $0 <backup-file.sql.gz>}"
TEST_DB_NAME="${TEST_DB_NAME:-devsync_restore_test}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:?DB_PASSWORD must be set}"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "❌ Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

log() { echo "[$(date '+%H:%M:%S')] $1"; }

log "🧪 Starting restore test with: ${BACKUP_FILE}"
log "   Target test database: ${TEST_DB_NAME}"

# Step 1: Drop and recreate test database
log "1️⃣  Creating clean test database..."
MYSQL_PWD="${DB_PASSWORD}" mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" \
    -e "DROP DATABASE IF EXISTS \`${TEST_DB_NAME}\`; CREATE DATABASE \`${TEST_DB_NAME}\`;" 2>/dev/null

# Step 2: Restore the backup
log "2️⃣  Restoring backup..."
if gunzip -c "${BACKUP_FILE}" | MYSQL_PWD="${DB_PASSWORD}" mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" "${TEST_DB_NAME}" 2>/dev/null; then
    log "   ✅ Restore completed"
else
    log "   ❌ Restore failed"
    MYSQL_PWD="${DB_PASSWORD}" mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" \
        -e "DROP DATABASE IF EXISTS \`${TEST_DB_NAME}\`;" 2>/dev/null
    exit 1
fi

# Step 3: Verify critical tables exist
log "3️⃣  Verifying schema..."
REQUIRED_TABLES="users projects subscriptions payments plans webhook_events notifications audit_logs"
MISSING=0
for TABLE in ${REQUIRED_TABLES}; do
    if MYSQL_PWD="${DB_PASSWORD}" mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" \
        -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${TEST_DB_NAME}' AND table_name='${TABLE}';" 2>/dev/null | grep -q "^0$"; then
        log "   ❌ Missing table: ${TABLE}"
        MISSING=1
    else
        COUNT=$(MYSQL_PWD="${DB_PASSWORD}" mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" \
            -N -e "SELECT COUNT(*) FROM \`${TEST_DB_NAME}\`.${TABLE};" 2>/dev/null)
        log "   ✅ ${TABLE}: ${COUNT} rows"
    fi
done

# Step 4: Verify key data
log "4️⃣  Verifying data integrity..."
USER_COUNT=$(MYSQL_PWD="${DB_PASSWORD}" mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" \
    -N -e "SELECT COUNT(*) FROM \`${TEST_DB_NAME}\`.users;" 2>/dev/null)
PLAN_COUNT=$(MYSQL_PWD="${DB_PASSWORD}" mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" \
    -N -e "SELECT COUNT(*) FROM \`${TEST_DB_NAME}\`.plans;" 2>/dev/null)
log "   Users: ${USER_COUNT}, Plans: ${PLAN_COUNT}"

if [ "${USER_COUNT}" -eq 0 ]; then
    log "   ⚠️  Warning: No users found (may be expected for fresh backup)"
fi

# Step 5: Cleanup
log "5️⃣  Cleaning up test database..."
MYSQL_PWD="${DB_PASSWORD}" mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" \
    -e "DROP DATABASE IF EXISTS \`${TEST_DB_NAME}\`;" 2>/dev/null

if [ "${MISSING}" -eq 0 ]; then
    log "🎉 Restore test PASSED — backup is valid and restorable"
    exit 0
else
    log "💥 Restore test FAILED — missing required tables"
    exit 1
fi
