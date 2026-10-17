# syntax=docker/dockerfile:1
#
# DevSync — single-image deployment for Render (Docker web service).
#
# One container runs:
#   nginx  :$PORT  -> static React SPA + reverse proxy for /api, /ws, /oauth2, /login
#   java          -> Spring Boot on 127.0.0.1:8080 (never exposed directly)
#
# The existing backend/Dockerfile and frontend/Dockerfile are intentionally left
# untouched: they remain the correct images for the docker-compose/VPS path,
# where MySQL and both containers share a Docker network.

# ─────────────────────────────────────────────────────────────
# 1. Frontend (React + Vite, built with the committed bun.lock)
# ─────────────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS frontend-build

WORKDIR /app/frontend

# Same-origin defaults: nginx below proxies these paths, so no hostname is
# baked into the bundle and ws/wss follows the page protocol automatically.
ARG VITE_API_URL=/api
ARG VITE_WS_URL=/ws
ARG VITE_SENTRY_DSN=""
ENV VITE_API_URL=$VITE_API_URL \
    VITE_WS_URL=$VITE_WS_URL \
    VITE_SENTRY_DSN=$VITE_SENTRY_DSN

COPY frontend/package.json frontend/bun.lock ./
RUN bun install --frozen-lockfile

COPY frontend/ ./
# frontend/vite.config.ts sets outDir: "../dist", so with WORKDIR /app/frontend
# the build lands in /app/dist (verified in the repo, not assumed).
RUN bun run build

# ─────────────────────────────────────────────────────────────
# 2. Backend (Spring Boot 3.4.13, Java 21, Maven wrapper version 3.9.x)
# ─────────────────────────────────────────────────────────────
FROM maven:3.9.6-eclipse-temurin-21 AS backend-build

WORKDIR /app
COPY backend/pom.xml ./
RUN mvn -B -q dependency:go-offline

COPY backend/src ./src
# pom.xml produces target/devsync-backend-1.0.0.jar; tests run in CI, not here.
RUN mvn -B -DskipTests package

# ─────────────────────────────────────────────────────────────
# 3. Runtime: nginx + JRE in one image
# ─────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine

RUN apk add --no-cache nginx openssl \
    && addgroup -S app \
    && adduser -S app -G app

WORKDIR /app

COPY --from=backend-build /app/target/*.jar /app/app.jar
COPY --from=frontend-build /app/dist/ /usr/share/nginx/html/

COPY deploy/nginx.conf /etc/nginx/nginx.conf.template
COPY deploy/start.sh /app/start.sh

RUN mkdir -p /app/uploads /app/certs \
    /tmp/client_temp /tmp/proxy_temp /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp \
    /tmp/logs /var/lib/nginx/logs /var/lib/nginx/tmp /var/log/nginx \
    && chown -R app:app /app /usr/share/nginx/html /tmp/logs /tmp/client_temp /tmp/proxy_temp /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp /var/lib/nginx /var/log/nginx \
    && chmod +x /app/start.sh

USER app

# Render injects PORT (10000 by default). start.sh renders nginx.conf with it.
ENV PORT=10000 \
    BACKEND_PORT=8080 \
    UPLOAD_DIR=/app/uploads \
    JAVA_OPTS="-XX:MaxRAMPercentage=50 -XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError"

EXPOSE 10000

# /api/health is the real endpoint (HealthController). It is proxied by nginx,
# so this also proves the reverse proxy works.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1 || exit 1

STOPSIGNAL SIGTERM
ENTRYPOINT ["/app/start.sh"]
