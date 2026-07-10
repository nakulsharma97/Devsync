#!/usr/bin/env bash
# ============================================================
# DevSync Database Backup Script
# Usage: ./scripts/backup-db.sh [output-dir]
#
# Designed to run as a cron job or Docker sidecar container.
# Requires: mysql client (mysql, mysqldump)
# ============================================================
set -euo pipefail

# Configuration — override via environment variables
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-password}"
DB_NAME="${DB_NAME:-devsync_db}"
BACKUP_DIR="${1:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/devsync_${DB_NAME}_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "📦 Backing up ${DB_NAME}@${DB_HOST}:${DB_PORT} → ${BACKUP_FILE}"

# Dump: --single-transaction for InnoDB consistency without locking
#       --routines to include stored procs/triggers
#       --no-tablespaces for cloud-hosted MySQL compat
MYSQL_PWD="${DB_PASSWORD}" mysqldump \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --user="${DB_USER}" \
    --single-transaction \
    --routines \
    --no-tablespaces \
    --databases "${DB_NAME}" \
    | gzip > "${BACKUP_FILE}"

# Validate
if [ -f "${BACKUP_FILE}" ]; then
    SIZE="$(du -h "${BACKUP_FILE}" | cut -f1)"
    echo "✅ Backup complete: ${SIZE}"
else
    echo "❌ Backup failed: ${BACKUP_FILE} not created"
    exit 1
fi

# Cleanup old backups
find "${BACKUP_DIR}" -name "devsync_${DB_NAME}_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
echo "🧹 Cleaned up backups older than ${RETENTION_DAYS} days"
