# DevSync Backend

Spring Boot 3.4 + Java 21 REST API backend for the DevSync developer collaboration platform.

## Prerequisites

- Java 21+
- Maven 3.9+
- MySQL 8.0+

## Quick Start

### 1. Create Database

```sql
CREATE DATABASE dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

The default schema name is `dev` (override with `SPRING_DATASOURCE_DB=...` if you
use a different one). Flyway creates all tables on first startup.

### 2. Run (development)

Run with the `dev` profile — it supplies local-only defaults (MySQL `root` / `12345`,
a development JWT secret). These values are DEV-ONLY and are refused by the
production validator.

```bash
cd backend
SPRING_PROFILES_ACTIVE=dev mvn spring-boot:run
```

Or without a profile, by providing the same configuration explicitly:

```bash
export JWT_SECRET=your-256-bit-secret-key-here
export SPRING_DATASOURCE_PASSWORD=12345
export MAIL_USERNAME=your-email@gmail.com
export MAIL_PASSWORD=your-app-password
mvn spring-boot:run
```

The API starts at: **http://localhost:8080**. The base `application.yml` has **no
secret defaults** — running without a profile and without `JWT_SECRET` fails
immediately (fail-fast).

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | **Yes** (prod) | – | 256-bit+ secret for signing JWTs. Generate with `openssl rand -base64 64`. |
| `MYSQL_USER` | No | `root` | MySQL username. |
| `MYSQL_PASSWORD` | **Yes** | – | MySQL password. |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | No | – | SMTP credentials for OTP emails. |
| `DEVSYNC_ADMIN_SEED_ENABLED` | No | `false` | Set to `true` to seed a bootstrap admin on startup. **Never enabled implicitly.** |
| `DEVSYNC_ADMIN_EMAIL` | When seeding | – | Email of the bootstrap admin account. |
| `DEVSYNC_ADMIN_PASSWORD` | When seeding | – | Password of the bootstrap admin account. Never logged, never exposed via API, stored BCrypt-encoded. |
| `DEVSYNC_CORS_ORIGINS` | No | `http://localhost:5173,http://localhost:3000` | Comma-separated allowed CORS origins. Set to your real frontend origin in production. |
| `FRONTEND_URL` | No | `http://localhost:5173` | Origin used in password-reset / email-verification links sent by email (e.g. `https://app.example.com`). |
| `DEVSYNC_ACCOUNT_TOKEN_EXPIRATION_MINUTES` | No | `15` | Lifetime of single-use reset/verification tokens. |
| `DEVSYNC_TRUST_X_FORWARDED_FOR` | No | `false` | Set `true` ONLY when the app sits behind a reverse proxy you control (nginx/LB). Never trust the header when the app is directly reachable — it is spoofable and would bypass rate limiting. |
| `UPLOAD_DIR` / `UPLOAD_MAX_SIZE` | No | `./uploads` / `10485760` | File upload location and max size in bytes. |

> There are **no default admin credentials**. The old `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD`
> variables (which defaulted to `admin@devsync.com` / `Admin@123`) have been removed.

---

## Configuration Profiles

| Profile | File | Purpose |
|---------|------|---------|
| *(none)* | `application.yml` | Profile-neutral base. All secrets come from environment variables — **no secret defaults**, missing `JWT_SECRET` fails startup. |
| `dev` | `application-dev.yml` | Local development. Contains the ONLY development fallback values (MySQL `root`/`12345`, a dev JWT secret), clearly labeled and overridable via env. |
| `test` | `application-test.yml` | Automated tests (H2, in-memory, test-only secrets). |
| `prod` | `application-prod.yml` | Production. Strict: every required secret is a placeholder **without a default** so a missing variable aborts startup. |
| `oauth` | `application-oauth.yml` | OAuth2 login providers (GitHub/Google). Secrets are env-only and required — activating this profile without the env vars fails startup. |

### Fail-fast production validation

With `SPRING_PROFILES_ACTIVE=prod`, `ProductionConfigValidator` runs at startup and aborts
the application when:

- `JWT_SECRET` is missing, shorter than 32 characters, or equal to a known development fallback value;
- `SPRING_DATASOURCE_PASSWORD` is missing or equal to the known local-development value (`12345`);
- SMTP credentials are half-configured (`MAIL_USERNAME` without `MAIL_PASSWORD` or vice versa);
- admin seeding is enabled without `DEVSYNC_ADMIN_EMAIL` / `DEVSYNC_ADMIN_PASSWORD`;
- GitHub integration is half-configured, or enabled without `GITHUB_REDIRECT_URI`;
- OAuth login providers are half-configured.

The validator logs only the **names** of the offending variables — values are never logged,
and startup aborts with `IllegalStateException`. This complements Spring's placeholder
resolution: `application-prod.yml` declares secrets as `${VAR}` with no default, so a missing
variable fails even earlier.

## Admin Accounts

Admin seeding is **opt-in**. The backend never creates an admin account unless `DEVSYNC_ADMIN_SEED_ENABLED=true`
**and** both `DEVSYNC_ADMIN_EMAIL` and `DEVSYNC_ADMIN_PASSWORD` are set.

### Local development

```bash
cd backend
DEVSYNC_ADMIN_SEED_ENABLED=true \
DEVSYNC_ADMIN_EMAIL=admin@devsync.com \
DEVSYNC_ADMIN_PASSWORD='a-strong-local-password' \
mvn spring-boot:run
```

Login at `POST /api/auth/login` with the configured email and password. The seeded account has:

- `ADMIN` role (full access to `/api/admin/**`)
- `emailVerified = true`
- `blocked = false`, `deleted = false`
- BCrypt-encoded password

### Production

```bash
DEVSYNC_ADMIN_SEED_ENABLED=true \
DEVSYNC_ADMIN_EMAIL='ops@yourdomain.com' \
DEVSYNC_ADMIN_PASSWORD='$(openssl rand -base64 24)' \
java -jar devsync-backend.jar
```

Guidelines:

- Keep `DEVSYNC_ADMIN_SEED_ENABLED=false` (the default) unless you are deliberately provisioning the first admin.
- Provide credentials via a secret manager / CI secret store - never commit them to the repository.
- Set `DEVSYNC_ADMIN_SEED_ENABLED=false` after the first admin exists; the bootstrap never overwrites an existing admin anyway.
- Store the generated password in your password manager immediately; it is not recoverable from the database (BCrypt).

### Bootstrap behavior (safe by design)

- If the configured email does **not** exist, an admin account is created exactly once.
- If the configured email already belongs to an **admin**, seeding is skipped - the existing password, name and role are **never** modified.
- If the configured email belongs to a normal **USER** account, seeding is refused with a clear startup error - the account is **never silently promoted**. Grant the `ADMIN` role via the admin panel instead.
- If seeding is enabled but credentials are missing, startup logs an error and creates nothing.

## Password Reset & Email Verification

Password reset and email verification share one secure token design:

- **Single-use tokens** — consumed on first use; every reuse is rejected.
- **Short-lived** — default 15 minutes (`DEVSYNC_ACCOUNT_TOKEN_EXPIRATION_MINUTES`). Expired tokens are deleted on sight.
- **Hashed at rest** — only the SHA-256 hash of the token is stored; the raw token exists only in the email link.
- **Generic responses** — `POST /api/auth/forgot-password` and `POST /api/auth/email/verify/request` always return `{success: true}` regardless of whether the email exists, so neither endpoint can be used to enumerate accounts.
- **Rate-limited per email** (3 requests / 15 min, silently refused beyond that) on top of the global per-IP auth limiter.
- **Session revocation** — a successful reset sets the new password and revokes every refresh session (`RefreshTokenService.revokeAllForUser`), forcing a fresh login. Raw tokens and passwords are never logged.

Flow: `POST /api/auth/forgot-password` → email link → `POST /api/auth/reset-password` (token + new password) → all refresh sessions revoked → login again.

**Email verification is optional in the current product.** Registration and password login do not require a verified address (only OAuth2 and OTP logins auto-verify). Unverified accounts can still use the app; the verification endpoints (`POST /api/auth/email/verify/request` + `POST /api/auth/email/verify`) and the `/verify-email` page exist so users can opt in. If verification ever becomes mandatory, the gate is `UserDetailsServiceImpl` mapping `emailVerified` to Spring Security's `enabled` flag (single change point) — but flipping that would break existing unverified accounts, so it is deliberately off.

## Security Notes

- Admin endpoints (`/api/admin/**`) are protected by `ROLE_ADMIN` via JWT - users without the role get `403`.
- An admin **cannot** remove their own `ADMIN` role, block themselves, or delete themselves (`AdminService` validates the acting admin against the target).
- Admin passwords are BCrypt-encoded with the shared `PasswordEncoder`; they are never logged and never returned by any API.
- Existing admins can be managed (role changes, blocking) from the Admin dashboard in the React frontend.

## Activity & Audit Logging

### Activity timeline

User-facing activity events are recorded for: project create/update/archive/restore/delete,
task create/update/move/complete/delete, member join/leave, invitation send/accept, join
request/approve, messages, posts, comments, uploads, role changes, blocks/unblocks, and
report resolved/rejected.

### Audit log

Security-sensitive events are written to `audit_logs`: register, login success/failure,
logout, JWT refresh, OTP verified, OAuth login, password/email changes, role changed,
admin created, user blocked/unblocked/deleted, project archived/restored/deleted,
visibility changed, and moderation actions. Each entry captures actor, target, action,
status, IP address, device, browser, timestamp and a details string (when available).

**Never logged**: passwords, JWT access/refresh tokens, OTP codes, OAuth secrets,
authorization headers, or raw request bodies. Details fields contain only email addresses,
IDs and generic status text - never credentials.

### Retention policy (planned - no automatic deletion)

Audit records are currently **retained indefinitely** and are **never deleted automatically**.
Before any retention/deletion job is introduced, the following policy must be explicitly
documented and approved:

| Tier | Suggested retention | Notes |
|------|--------------------|-------|
| Security events (LOGIN_*, JWT_REFRESH, OTP_VERIFIED, role/block/delete, moderation) | 365+ days | Compliance-relevant; keep longest |
| Administrative events (PROJECT_*, USER_*, ROLE_CHANGED) | 180+ days | Operations forensics |
| Oldest non-critical events | archive to cold storage | Never hard-delete without a policy decision |

Any future cleanup job must: run manually or with an explicit opt-in flag, log what it
deletes, and be covered by tests. There is intentionally **no** scheduled purge in the codebase.

## API Endpoints

### Auth (`/api/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register with email + password |
| POST | `/api/auth/login` | Login with email + password |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/otp/send?email=` | Send OTP for email login |
| POST | `/api/auth/otp/verify` | Verify OTP and login |
| POST | `/api/auth/oauth/callback` | OAuth2 callback handler |
| POST | `/api/auth/forgot-password` | Request password reset (generic response) |
| POST | `/api/auth/reset-password` | Set new password with single-use token |
| POST | `/api/auth/email/verify/request` | Request email verification link (generic response) |
| POST | `/api/auth/email/verify` | Verify email with single-use token |
| GET | `/api/auth/me` | Get current user (requires auth) |

### Users (`/api/users`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/me` | Get my profile |
| PUT | `/api/users/me` | Update my profile |
| GET | `/api/users/{id}` | Get user by ID |
| GET | `/api/users?q=` | Search users |

### Projects (`/api/projects`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | Get my projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/{id}` | Get project details |
| PUT | `/api/projects/{id}` | Update project |
| DELETE | `/api/projects/{id}` | Delete project |
| POST | `/api/projects/{id}/members` | Add member |
| DELETE | `/api/projects/{id}/members/{userId}` | Remove member |

### Team Rooms (`/api/rooms`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rooms` | Get my rooms |
| POST | `/api/rooms` | Create room |
| GET | `/api/rooms/{id}` | Get room details |
| POST | `/api/rooms/{id}/invite` | Invite user to room |
| GET | `/api/rooms/{id}/participants` | Get room participants |

### Messages (`/api/messages`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages/conversations` | Get all conversations |
| GET | `/api/messages/room/{roomId}` | Get room messages |
| GET | `/api/messages/dm/{userId}` | Get DM conversation |
| POST | `/api/messages` | Send a message |

### WebSocket (`/ws`)

Use SockJS + STOMP:

```
Connect: http://localhost:8080/ws
Subscribe: /topic/room/{roomId}
Subscribe: /user/queue/messages
Subscribe: /user/queue/notifications
Send: /app/chat.send
Send: /app/chat.typing
```

### Notifications (`/api/notifications`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get notifications |
| GET | `/api/notifications/unread-count` | Get unread count |
| PUT | `/api/notifications/{id}/read` | Mark as read |
| PUT | `/api/notifications/read-all` | Mark all as read |

### Kanban Boards (`/api/boards`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards/{id}` | Get board with columns & tasks |
| GET | `/api/boards/project/{projectId}` | Get project board |
| POST | `/api/boards?name=&projectId=&columns=` | Create board |
| POST | `/api/boards/tasks` | Create task |
| PUT | `/api/boards/tasks/position` | Update task position (drag-drop) |
| PUT | `/api/boards/tasks/{id}` | Update task |
| DELETE | `/api/boards/tasks/{id}` | Delete task |

## Authentication

All protected endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

Get your token from `POST /api/auth/login` or `POST /api/auth/register`.
