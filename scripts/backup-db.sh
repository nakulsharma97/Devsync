#!/usr/bin/env bash
# ============================================================
# DevSync Database Backup Script
# Usage: ./scripts/backup-db.sh [output-dir]
#
# Designed to run as a cron job or Docker sidecar container.
# Requires: mysql client (mysql, mysqldump)
#
# Exit codes:
#   0  Backup succeeded
#   1  Configuration error or backup failure
# ============================================================
set -euo pipefail

# Configuration — override via environment variables.
# DB_PASSWORD is REQUIRED (no default) so a real credential can never be
# baked into a backup script or cron entry.
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:?DB_PASSWORD must be set (e.g. export DB_PASSWORD=...)}"
DB_NAME="${DB_NAME:-devsync_db}"
BACKUP_DIR="${1:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/devsync_${DB_NAME}_${TIMESTAMP}.sql.gz"
LOG_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.log"

mkdir -p "${BACKUP_DIR}"

log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo "${msg}"
    echo "${msg}" >> "${LOG_FILE}" 2>/dev/null || true
}

log "📦 Starting backup: ${DB_NAME}@${DB_HOST}:${DB_PORT} → ${BACKUP_FILE}"

# Dump: --single-transaction for InnoDB consistency without locking
#       --routines to include stored procs/triggers
#       --no-tablespaces for cloud-hosted MySQL compat
if MYSQL_PWD="${DB_PASSWORD}" mysqldump \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --user="${DB_USER}" \
    --single-transaction \
    --routines \
    --no-tablespaces \
    --databases "${DB_NAME}" \
    2>>"${LOG_FILE}" \
    | gzip > "${BACKUP_FILE}"; then

    # Validate the backup file exists and has content
    if [ -f "${BACKUP_FILE}" ] && [ -s "${BACKUP_FILE}" ]; then
        SIZE="$(du -h "${BACKUP_FILE}" | cut -f1)"
        log "✅ Backup complete: ${SIZE}"
    else
        log "❌ Backup failed: ${BACKUP_FILE} is empty or missing"
        exit 1
    fi
else
    log "❌ Backup failed: mysqldump returned non-zero exit code"
    # Clean up partial backup
    rm -f "${BACKUP_FILE}"
    exit 1
fi

# Cleanup old backups
DELETED=$(find "${BACKUP_DIR}" -name "devsync_${DB_NAME}_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete -print | wc -l)
log "🧹 Cleaned up ${DELETED} backup(s) older than ${RETENTION_DAYS} days"

log "📦 Backup script finished successfully"
