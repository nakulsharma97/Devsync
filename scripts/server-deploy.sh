#!/usr/bin/env bash
# ============================================================
# DevSync — the deploy payload that runs on the deploy host.
#
# This file is the single source of truth for what a deployment
# actually does. Two callers run it, and neither keeps its own copy
# of these commands:
#
#   1. .github/workflows/cd.yml  → deploy-server     (over SSH, real host)
#   2. .github/workflows/cd.yml  → deploy-rehearsal  (on a runner, throwaway stack)
#
# Because the rehearsal executes this exact file, whatever is
# rehearsed is what production runs — the two paths cannot drift.
#
# Secrets are NOT passed in by the caller: `docker compose` reads
# <deploy dir>/.env automatically (see .env.example).
#
# Env:
#   DEVSYNC_DEPLOY_DIR   checked-out stack on the host (default: /opt/devsync)
# ============================================================
set -euo pipefail

DEPLOY_DIR="${DEVSYNC_DEPLOY_DIR:-/opt/devsync}"

if [ ! -f "${DEPLOY_DIR}/docker-compose.yml" ]; then
    echo "✖ No docker-compose.yml in ${DEPLOY_DIR} — refusing to deploy." >&2
    exit 1
fi

cd "${DEPLOY_DIR}"

echo "▶ docker compose pull"
docker compose pull

echo "▶ docker compose up -d --remove-orphans"
docker compose up -d --remove-orphans

echo "▶ docker image prune -f"
docker image prune -f

echo "✅ Deploy payload finished"
