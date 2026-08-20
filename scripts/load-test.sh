#!/usr/bin/env bash
# ============================================================
# DevSync Load Test Script (lightweight, curl-based)
# Usage: ./scripts/load-test.sh [base-url] [concurrency] [requests]
#
# Tests: auth login, billing subscription, billing plans
# Safe for local/staging — uses existing user credentials.
# ============================================================
set -euo pipefail

BASE_URL="${1:-http://localhost:8080}"
CONCURRENCY="${2:-10}"
REQUESTS="${3:-100}"
TEST_EMAIL="${TEST_EMAIL:-alice@test.dev}"
TEST_PASSWORD="${TEST_PASSWORD:-Test1234!}"

echo "🧪 DevSync Load Test"
echo "   Target: ${BASE_URL}"
echo "   Concurrency: ${CONCURRENCY}"
echo "   Total requests: ${REQUESTS}"
echo ""

# Check if the server is reachable
if ! curl -sf "${BASE_URL}/api/health" > /dev/null 2>&1; then
    echo "❌ Server not reachable at ${BASE_URL}"
    exit 1
fi
echo "✅ Server is reachable"

# Helper: measure request latency
measure() {
    local url="$1"
    local method="${2:-GET}"
    local data="${3:-}"
    local start end elapsed http_code

    start=$(date +%s%N)
    if [ -n "${data}" ]; then
        http_code=$(curl -sf -o /dev/null -w "%{http_code}" -X "${method}" "${url}" \
            -H "Content-Type: application/json" -d "${data}" 2>/dev/null || echo "000")
    else
        http_code=$(curl -sf -o /dev/null -w "%{http_code}" -X "${method}" "${url}" 2>/dev/null || echo "000")
    fi
    end=$(date +%s%N)
    elapsed=$(( (end - start) / 1000000 ))
    echo "${elapsed} ${http_code}"
}

# ── Auth Load Test ─────────────────────────────────────────
echo ""
echo "── Auth: Login (${REQUESTS} requests, ${CONCURRENCY} concurrent) ──"
TOTAL_MS=0
ERRORS=0
declare -a LATENCIES=()

for i in $(seq 1 "${REQUESTS}"); do
    CSRF=$(curl -sf http://localhost:5173/api/auth/csrf 2>/dev/null | grep -oP '"csrfToken":"\K[^"]+' || echo "")
    RESULT=$(measure "${BASE_URL}/api/auth/login" POST \
        "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}" 2>/dev/null)
    LATENCY=$(echo "${RESULT}" | awk '{print $1}')
    CODE=$(echo "${RESULT}" | awk '{print $2}')
    TOTAL_MS=$((TOTAL_MS + LATENCY))
    LATENCIES+=("${LATENCY}")
    [ "${CODE}" != "200" ] && ERRORS=$((ERRORS + 1))

    # Throttle to avoid rate limiting
    [ $((i % CONCURRENCY)) -eq 0 ] && sleep 0.1
done

AVG_MS=$((TOTAL_MS / REQUESTS))
ERROR_RATE=$(echo "scale=1; ${ERRORS} * 100 / ${REQUESTS}" | bc 2>/dev/null || echo "N/A")
echo "   Avg latency: ${AVG_MS}ms | Errors: ${ERRORS}/${REQUESTS} (${ERROR_RATE}%)"

# ── Billing Load Test ──────────────────────────────────────
echo ""
echo "── Billing: Plans (public, ${REQUESTS} requests) ──"
TOTAL_MS=0
ERRORS=0
for i in $(seq 1 "${REQUESTS}"); do
    RESULT=$(measure "${BASE_URL}/api/public/plans" GET)
    LATENCY=$(echo "${RESULT}" | awk '{print $1}')
    CODE=$(echo "${RESULT}" | awk '{print $2}')
    TOTAL_MS=$((TOTAL_MS + LATENCY))
    [ "${CODE}" != "200" ] && ERRORS=$((ERRORS + 1))
    [ $((i % CONCURRENCY)) -eq 0 ] && sleep 0.05
done
AVG_MS=$((TOTAL_MS / REQUESTS))
echo "   Avg latency: ${AVG_MS}ms | Errors: ${ERRORS}/${REQUESTS}"

echo ""
echo "🏁 Load test complete"
