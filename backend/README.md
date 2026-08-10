# DevSync Backend

Spring Boot 3.4 + Java 21 REST API backend for the DevSync developer collaboration platform.

## Prerequisites

- Java 21+
- Maven 3.9+
- MySQL 8.0+

## Quick Start

### 1. Create Database

```sql
CREATE DATABASE devsync CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Configure

Edit `src/main/resources/application.yml` or set environment variables:

```bash
export JWT_SECRET=your-256-bit-secret-key-here
export MAIL_USERNAME=your-email@gmail.com
export MAIL_PASSWORD=your-app-password
```

### 3. Run

```bash
cd backend
mvn clean install
mvn spring-boot:run
```

The API starts at: **http://localhost:8080**

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
| `DEVSYNC_TRUST_X_FORWARDED_FOR` | No | `false` | Set `true` ONLY when the app sits behind a reverse proxy you control (nginx/LB). Never trust the header when the app is directly reachable — it is spoofable and would bypass rate limiting. |
| `UPLOAD_DIR` / `UPLOAD_MAX_SIZE` | No | `./uploads` / `10485760` | File upload location and max size in bytes. |

> There are **no default admin credentials**. The old `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD`
> variables (which defaulted to `admin@devsync.com` / `Admin@123`) have been removed.

---

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
