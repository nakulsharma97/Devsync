# DevSync — Production Operations Guide

## Production architecture

```
                        ┌──────────────────────────────────────────────┐
   Browser ──HTTPS──▶   │  Reverse proxy (nginx / LB / Cloud)           │
                        │   - TLS termination                            │
                        │   - gzip compression                          │
                        │   - static frontend (SPA)                     │
                        │   - /api  → backend:8080                      │
                        │   - /uploads → backend:8080                   │
                        │   - /ws   → backend:8080 (WebSocket upgrade)  │
                        └───────────────┬──────────────────────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    │   frontend (nginx-unprivileged, :8080) │
                    │   (served by the reverse proxy above)  │
                    └───────────────────────────────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    │   backend (Spring Boot, :8080)        │
                    │   - JWT auth (stateless)              │
                    │   - Flyway migrations                 │
                    │   - /actuator/health                  │
                    └───────────────────┬───────────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    │   mysql:8.0 (devsync_db)              │
                    │   volume: mysql_data                  │
                    └───────────────────────────────────────┘
```

- **HTTPS** is terminated at the reverse proxy (nginx on the host, a cloud LB, or a
  managed CDN). The app itself is plain HTTP inside the Docker network.
- **WebSocket**: the proxy must forward the `Upgrade`/`Connection` headers for
  `/ws/` (see `frontend/nginx.conf`) — real-time chat/presence breaks without it.
- **Uploads** live on a persistent volume (`uploads`) mounted at `/app/uploads`;
  the backend serves them back at `/uploads/**`.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | **Yes** | 256-bit+ signing secret. `openssl rand -base64 64`. Never commit. |
| `MYSQL_ROOT_PASSWORD` | **Yes** (compose) | MySQL root password. |
| `MYSQL_PASSWORD` | **Yes** (compose) | Password for the dedicated `devsync` DB user (app never uses root). |
| `DEVSYNC_CORS_ORIGINS` | No | Comma-separated allowed origins. Default: localhost. |
| `DEVSYNC_TRUST_X_FORWARDED_FOR` | No | `true` only behind your own reverse proxy. |
| `DEVSYNC_ADMIN_SEED_ENABLED` / `_EMAIL` / `_PASSWORD` | No | Opt-in bootstrap admin. Default `false`; never default credentials. |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | For OTP | SMTP credentials for OTP emails. |
| `UPLOAD_DIR` / `UPLOAD_MAX_SIZE` | No | Upload location / max bytes. |
| `DEVSYNC_JWT_ACCESS_EXPIRATION_MS` | No | Access-token lifetime (default `900000` = 15 min). |
| `DEVSYNC_JWT_REFRESH_EXPIRATION_MS` | No | Refresh-token lifetime (default `2592000000` = 30 days). |
| `DEVSYNC_COOKIE_SECURE` | **Yes (prod)** | `true` behind HTTPS — marks the refresh cookie Secure. |
| `DEVSYNC_WS_RATE_LIMIT_ENABLED` / `_MAX_MESSAGES` / `_MAX_SUBSCRIPTIONS` | No | Per-user WebSocket rate limits (defaults: on, 120 msgs/min, 30 subs/min). |
| `SPRING_DATASOURCE_URL` | No | Override for local non-TLS MySQL (see Database TLS below). |

**Never** commit real values. Use a `.env` file (gitignored) or your secrets manager.
OAuth client IDs/secrets come from `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`,
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (see `backend/src/main/resources/application-oauth.yml`).

## Deploying with Docker Compose

```bash
# 1. Prepare secrets
cp .env.example .env            # or create from the table above
openssl rand -base64 64         # -> JWT_SECRET

# 2. Build and start
docker compose up -d --build

# 3. Verify
docker compose ps               # all three services healthy
curl -fsS http://localhost/api/health
curl -fsS http://localhost/actuator/health

# 4. Bootstrap the first admin (one-time)
docker compose exec backend env \
  DEVSYNC_ADMIN_SEED_ENABLED=true \
  DEVSYNC_ADMIN_EMAIL=ops@yourdomain.com \
  DEVSYNC_ADMIN_PASSWORD='<generated>' \
  java -jar app.jar --spring.main.web-application-type=none 2>/dev/null || true
# Simpler: set the three DEVSYNC_ADMIN_* vars in .env, run `docker compose up -d`
# once, then set DEVSYNC_ADMIN_SEED_ENABLED back to false.
```

## Database TLS (backend ↔ MySQL)

Production compose connects to MySQL over TLS with certificate verification:

```bash
# 1. Generate a local CA + server certificate + Java truststore (one-time)
./scripts/generate-db-certs.sh
#    creates ./certs/{ca.pem, ca-key.pem, server-cert.pem, server-key.pem, backend-truststore.p12}

# 2. docker compose up -d --build
#    - MySQL serves TLS (mounts ./certs read-only; CA key never enters the container)
#    - The backend connects with useSSL=true&sslMode=VERIFY_CA against the truststore
```

- `certs/` is gitignored — it is per-deployment material, never committed.
- Rotate the certificates by re-running the script and restarting the stack.
- Local development against a plain MySQL keeps the `useSSL=false` dev URL
  (`SPRING_DATASOURCE_URL` override) — the insecure default is never used in the
  production compose file.

## Auth & token architecture (production notes)

- **Access tokens**: 15-minute JWT (configurable), sent as `Authorization: Bearer`.
  Short lifetime means a stolen access token is usable only briefly; blocked/deleted
  users are additionally rejected on every request.
- **Refresh tokens**: 30-day JWT, **HttpOnly + SameSite=Lax cookie** scoped to
  `/api/auth` — never visible to JavaScript, never in URLs, never in API responses.
  Every refresh **rotates** the token; presenting an already-rotated or revoked
  token is treated as theft and revokes the whole family. Logout revokes the cookie's
  token server-side; blocking or deleting an account revokes every refresh token
  immediately.
- **CSRF**: the refresh/logout cookies are SameSite=Lax (not sent on cross-site
  requests) and the API is CORS-restricted to configured origins with credentials
  — the stateless bearer flow needs no CSRF token.

## CI/CD

- **CI** (`.github/workflows/ci.yml`): auth unit tests → backend integration tests
  against MySQL with JaCoCo coverage → frontend typecheck, lint (fails on errors),
  build → Docker image builds. All jobs must pass.
- **CD** (`.github/workflows/cd.yml`): triggered by `workflow_run` on **successful CI**
  for `main` — builds & pushes `devsync-backend`/`devsync-frontend` images tagged by
  commit SHA. Tag pushes (`v*`) additionally run the SSH deploy step. Deployment never
  runs unless CI passed.

## Database

- **Migrations**: Flyway, `backend/src/main/resources/db/migration/V*__.sql`.
  Never edit an applied migration — add a new `V{n+1}__...sql`.
- **Backup**: with the compose stack running:

  ```bash
  docker compose exec mysql sh -c \
    'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines devsync_db' \
    > backup-$(date +%F).sql
  ```

- **Restore**:

  ```bash
  docker compose exec -T mysql sh -c \
    'mysql -u root -p"$MYSQL_ROOT_PASSWORD" devsync_db' < backup-2026-01-01.sql
  ```

- Schedule backups off-box (cron + object storage) and test restores regularly.

## Monitoring & logging

- **Health**: `/api/health` and `/actuator/health` (public, no details).
  Only `health`/`info` actuator endpoints are exposed.
- **Sentry**: frontend error tracking via `@sentry/react` (configure with
  `VITE_SENTRY_DSN`). Backend Sentry is not wired; add
  `sentry-spring-boot-starter-jakarta` if you want server-side error capture.
- **Logs**: `docker compose logs -f backend`. The app never logs passwords, JWTs,
  refresh tokens, OTP codes, or authorization headers (audit tests assert this).
  In production run `JWT_SECRET`, `MYSQL_PASSWORD`, etc. only as environment
  variables — never in files or logs.
- **Alerting**: health-check the LB target `/actuator/health` from your uptime
  monitor; alert on non-200.

## Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| Uploads fail over the proxy | `client_max_body_size` in nginx must be ≥ backend `max-request-size` (12m is set). |
| Real-time chat/presence dead behind proxy | `/ws/` location must forward `Upgrade`/`Connection` headers with long timeouts. |
| `401` on login after deploy | `JWT_SECRET` changed — tokens are signed with the old secret; users must re-login. Keep the secret stable. |
| Backend won't start: "WeakKeyException" | `JWT_SECRET` shorter than 256 bits. Regenerate. |
| CORS errors in production | Set `DEVSYNC_CORS_ORIGINS` to the exact frontend origin. |
| Admin API 403s | `/api/admin/**` requires the ADMIN role — seeded only via `DEVSYNC_ADMIN_SEED_*`. |
| Healthcheck flapping on first boot | `start_period` on the backend healthcheck covers Flyway migration time. |
