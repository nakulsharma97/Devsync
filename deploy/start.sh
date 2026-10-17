#!/bin/sh
#
# DevSync — combined-container entrypoint (Render Docker web service).
#
#   nginx  listens on $PORT (public)  -> serves the SPA, proxies /api,/ws,/oauth2,/login
#   java   listens on 127.0.0.1:$BACKEND_PORT (private)
#
# Optional: if the Aiven project CA is mounted as a Render secret file at
# /etc/secrets/aiven-ca.pem, it is imported into a PKCS12 truststore so the JDBC
# URL can use sslMode=VERIFY_IDENTITY (full certificate + hostname validation).
# No certificate is bundled in the image and no verification is ever disabled.

set -eu

PORT="${PORT:-10000}"
BACKEND_PORT="${BACKEND_PORT:-8080}"
UPLOAD_DIR="${UPLOAD_DIR:-/app/uploads}"
CA_FILE="${AIVEN_CA_FILE:-/etc/secrets/aiven-ca.pem}"
TRUSTSTORE="/app/certs/aiven-truststore.p12"

log() {
    printf '%s [start] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"
}

mkdir -p "$UPLOAD_DIR" /app/certs \
    /tmp/client_temp /tmp/proxy_temp /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp

# ── 1. Aiven CA -> Java truststore ───────────────────────────────
if [ -f "$CA_FILE" ] && [ ! -r "$CA_FILE" ]; then
    log "ERROR: $CA_FILE exists but is not readable by uid $(id -u)."
    log "Render mounts secret files under /etc/secrets; ensure the service can read it."
    exit 1
fi

if [ -f "$CA_FILE" ]; then
    if [ -f "$TRUSTSTORE" ]; then
        log "Truststore already present at $TRUSTSTORE"
    elif command -v keytool >/dev/null 2>&1; then
        log "Importing $CA_FILE into $TRUSTSTORE"
        rm -f "$TRUSTSTORE"
        if ! keytool -importcert -noprompt -alias aiven-ca -file "$CA_FILE" \
                -keystore "$TRUSTSTORE" -storetype PKCS12 -storepass changeit >/dev/null 2>&1; then
            log "ERROR: keytool could not import the CA certificate from $CA_FILE"
            rm -f "$TRUSTSTORE"
            exit 1
        fi
    elif command -v openssl >/dev/null 2>&1; then
        log "Importing $CA_FILE into $TRUSTSTORE (openssl fallback)"
        if ! openssl pkcs12 -export -nokeys -in "$CA_FILE" -out "$TRUSTSTORE" \
                -passout pass:changeit -name aiven-ca >/dev/null 2>&1; then
            log "ERROR: openssl could not build the truststore from $CA_FILE"
            rm -f "$TRUSTSTORE"
            exit 1
        fi
    else
        log "ERROR: neither keytool nor openssl is available to build the truststore"
        exit 1
    fi
elif printf '%s' "${SPRING_DATASOURCE_URL:-}" | grep -q 'trustCertificateKeyStoreUrl'; then
    # Fail loudly instead of letting the driver report a confusing TLS error.
    log "ERROR: SPRING_DATASOURCE_URL points at $TRUSTSTORE but $CA_FILE is missing."
    log "Add the Aiven CA certificate as a Render secret file named 'aiven-ca.pem'."
    exit 1
else
    log "No Aiven CA file at $CA_FILE; using the TLS settings in SPRING_DATASOURCE_URL as-is."
fi

# ── 2. Render nginx.conf with the real ports ────────────────────
sed -e "s/__PORT__/${PORT}/g" -e "s/__BACKEND_PORT__/${BACKEND_PORT}/g" \
    /etc/nginx/nginx.conf.template > /tmp/nginx.conf

if ! nginx -t -c /tmp/nginx.conf; then
    log "ERROR: nginx configuration test failed"
    exit 1
fi

# ── 3. Start Spring Boot (loopback only) ────────────────────────
JAVA_OPTS="${JAVA_OPTS:--XX:MaxRAMPercentage=50 -XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError}"

log "Starting backend on 127.0.0.1:${BACKEND_PORT} (uploads: ${UPLOAD_DIR})"
# shellcheck disable=SC2086  # JAVA_OPTS is intentionally word-split
java ${JAVA_OPTS} -Dserver.port="${BACKEND_PORT}" -jar /app/app.jar &
JAVA_PID=$!

# ── 4. Start nginx in the foreground of its own process ─────────
nginx -c /tmp/nginx.conf -g 'daemon off;' &
NGINX_PID=$!

STOP_REQUESTED=0
shutdown() {
    STOP_REQUESTED=1
    log "Shutting down (SIGTERM)"
    kill -TERM "$JAVA_PID" "$NGINX_PID" 2>/dev/null || true
}
trap shutdown TERM INT QUIT

# Alpine's `kill -0` also succeeds for a zombie child, so check the process
# state instead of relying on signal 0.
alive() {
    pid="$1"
    [ -d "/proc/$pid" ] || return 1
    state=$(awk '{print $3}' "/proc/$pid/stat" 2>/dev/null || echo R)
    [ "$state" != "Z" ]
}

while alive "$JAVA_PID" && alive "$NGINX_PID"; do
    sleep 5
done

if [ "$STOP_REQUESTED" = "1" ]; then
    # Render asked us to stop (deploy / scale-down): a clean exit is not a crash.
    wait 2>/dev/null || true
    log "Stopped"
    exit 0
fi

log "A supervised process exited; stopping the container so Render can restart it"
shutdown
wait 2>/dev/null || true
exit 1
