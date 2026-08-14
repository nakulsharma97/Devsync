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
| `DEVSYNC_RATE_LIMIT_INVITE_PER_MINUTE` | No | `10` | Max invitation / join-request / join POSTs per minute per user (or per IP when unauthenticated). |
| `UPLOAD_DIR` / `UPLOAD_MAX_SIZE` | No | `./uploads` / `10485760` | File upload location and max size in bytes. |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | **Yes** (prod) | – | Razorpay API keys (test mode: `rzp_test_*`). Checkout returns 503 until set. |
| `RAZORPAY_WEBHOOK_SECRET` | **Yes** (prod) | – | Secret for verifying `X-Razorpay-Signature` on webhooks (HMAC-SHA256). |
| `RAZORPAY_BASE_URL` | No | `https://api.razorpay.com` | Razorpay API base (override for sandbox/self-hosted). |
| `DEVSYNC_BILLING_CURRENCY` | No | `INR` | Plan currency. All amounts are stored in paise (minor units). |

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

### Web hardening

- **Security headers** are sent on every API response: `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`. The React
  SPA additionally receives a full CSP from nginx (see `frontend/nginx.conf`) — external
  scripts only, Google Fonts allow-listed, `frame-ancestors 'none'`, WebSocket via
  `connect-src 'self' ws: wss:`.
- **HSTS** is advertised only when `app.security.hsts=true` (set in `application-prod.yml`)
  **and** the request is secure — Spring checks `request.isSecure()`, which the prod profile
  enables via `server.forward-headers-strategy: framework` (nginx sets `X-Forwarded-Proto`).
  Plain-HTTP requests never receive the header.
- **CORS** is restricted to the explicit origins in `app.cors.allowed-origins`
  (`DEVSYNC_CORS_ORIGINS`) — never a wildcard, and never a wildcard with credentials.
- **CSRF** is disabled deliberately and documented in `SecurityConfig`: the API is stateless
  and every authenticated request uses a Bearer token, so there is no ambient-authority
  cookie to forge. The refresh token is an HttpOnly, SameSite=Lax cookie scoped to
  `/api/auth`, which is not vulnerable to CSRF (Lax cookies are not sent cross-site) and
  cannot be exfiltrated by XSS. If cookie-based session auth is ever introduced, CSRF
  protection MUST be re-enabled.

### Rate limiting

| Surface | Scope | Limit | Config |
|---|---|---|---|
| Auth endpoints (`/api/auth/**`) | per IP | 10/min | `app.rate-limit.enabled` (default on) |
| Password reset / email verify | per email (on top of IP) | 3/15 min | hard-coded in `AccountRecoveryService` |
| OTP generation | per email | 3/15 min | hard-coded in `OtpService` |
| Invite / join / join-request POSTs | per user (IP if unauthenticated) | 10/min | `app.rate-limit.invite.per-minute` |
| Review submissions & edits | per user | 5/hour | hard-coded in `ReviewService` |
| Private feedback submissions | per user | 10/day | hard-coded in `FeedbackService` |
| WebSocket messages / subscriptions | per user | 120/min, 30/min | `DEVSYNC_WS_RATE_LIMIT_*` |

All HTTP limiting goes through the `RateLimiter` interface
(`com.devsync.ratelimit`). The default `InMemoryFixedWindowRateLimiter` is correct for a
single instance and for development, but its state is local to the JVM and resets on
restart. For a clustered production deployment, provide a Redis-backed `RateLimiter` bean
(`INCR` + `EXPIRE`) — no other code changes. `app.rate-limit.trust-x-forwarded-for` must
only be enabled behind a proxy you control (`DEVSYNC_TRUST_X_FORWARDED_FOR=true` in
compose); the header is spoofable when the app is directly reachable.

`X-Forwarded-For` is only trusted when `app.rate-limit.trust-x-forwarded-for=true` — never
enable it unless the app is behind a proxy you control.

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
visibility changed, moderation actions, review submitted/approved/rejected/deleted/
featured, and private feedback received. Each entry captures actor, target, action,
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

## Billing & Subscriptions

DevSync uses **Razorpay** (INR) with server-side payment verification. The backend is the
single source of truth for plan state — a paid plan is activated **only** by a
signature-verified provider webhook, never by a frontend success callback.

### Flow

```
User → Pricing → /api/billing/checkout → Razorpay order + PENDING payment row
     → Razorpay Checkout (hosted, PCI) → payment.captured webhook
     → HMAC-SHA256 signature verified → amount/currency cross-checked
     → Payment SUCCESS + Subscription ACTIVE (30-day period) → audit + notification
```

### Plan catalog (configurable)

| Plan | ₹/month | Private projects | Members/project | Storage | Advanced analytics |
|------|---------|------------------|-----------------|---------|--------------------|
| FREE | 0 | 2 | 5 | 1 GB | no |
| PRO | 299 | 20 | 25 | 50 GB | yes |
| ENTERPRISE | 999 | unlimited | 100 | 250 GB | yes |

Limits live in the `plans` table (seeded by migration V16) and are editable at runtime:
`UPDATE plans SET private_project_limit = 5 WHERE code = 'FREE';` — NULL means unlimited.
The pricing page renders `GET /api/public/plans`; nothing is hardcoded in the frontend.

### Server-side enforcement (`EntitlementService`)

- **Private projects** — capped by the owner's plan; the user row is locked
  (`SELECT … FOR UPDATE`) so concurrent creations cannot race past the cap.
- **Members** — capped by the project **owner's** plan at invite/join/approve time
  (pending invitations do not count as seats).
- **Storage** — `SUM(file_attachments.size)` per uploader vs plan limit, checked before
  any file is stored.
- **Advanced analytics** — `GET /api/projects/{id}/analytics?advanced=true` returns 403
  (`ADVANCED_ANALYTICS`) unless the requester's plan allows it; the basic member view
  stays free.

Exceeded limits return `403` with a machine-readable `code` (`PRIVATE_PROJECT_LIMIT`,
`MEMBER_LIMIT`, `STORAGE_LIMIT`, `ADVANCED_ANALYTICS`) so the UI can show an upgrade CTA.
A malicious request can never self-declare a plan — entitlements always derive from the
authenticated user's subscription on the backend.

### Downgrade & expiry safety

Existing data is **never deleted** on downgrade. If a Pro user has 15 private projects and
drops to FREE (2 allowed), all 15 stay accessible; they simply cannot create the 16th
until they're within the limit or upgrade. Storage works the same way — existing files
stay downloadable; new uploads are blocked while usage exceeds the plan. Subscriptions
expire lazily on the next entitlement lookup (status → `EXPIRED`, audit + notification).

### Webhook security

`POST /api/billing/webhook/razorpay` is publicly reachable (required for Razorpay to
deliver it) but every request must carry a valid `X-Razorpay-Signature` (HMAC-SHA256 of
the raw body with `RAZORPAY_WEBHOOK_SECRET`). Processing is **idempotent**: the
`(provider, provider_event_id)` pair is unique in `webhook_events`, so a duplicate
delivery is acknowledged and skipped — never re-credited, never double-notified. Amount
and currency are cross-checked against the stored order; mismatches abort processing.

### Razorpay test mode

1. Create a Razorpay account and enable **test mode**; copy `Key Id` / `Key Secret`
   (`rzp_test_*`) and generate a webhook secret.
2. Configure the webhook in the Razorpay dashboard to POST to
   `https://<your-domain>/api/billing/webhook/razorpay` (HTTPS required in production).
3. Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (test values
   locally; production credentials only via secrets).
4. Test checkout with Razorpay's test cards (e.g. `4111 1111 1111 1111`); a captured
   payment activates the plan via webhook. Failed payments exercise `payment.failed`.
5. Production keys are never committed; `application-prod.yml` requires all three
   Razorpay variables at startup (fail-fast).

### Audit events (billing)

`CHECKOUT_CREATED`, `PAYMENT_SUCCESS`, `PAYMENT_FAILED`, `REFUND_PROCESSED`,
`SUBSCRIPTION_ACTIVATED`, `SUBSCRIPTION_RENEWED`, `SUBSCRIPTION_CANCELLED`,
`SUBSCRIPTION_EXPIRED`, `PLAN_CHANGED`. Card numbers, CVV and raw credentials are never
stored or logged — the payment ledger keeps only provider references.

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

**Project lifecycle:** a project moves through `ACTIVE → COMPLETED → ARCHIVED` (status)
and can be soft-deleted (`deleted = true` + `deletedAt`). Archived projects stay readable to
authorized members but reject all modifications. Deletion is **soft** from both the owner
(`DELETE /api/projects/{id}`) and admin (`DELETE /api/admin/projects/{id}`) paths: the row and
all related records (members, boards, tasks, rooms, messages, attachments, invitations,
notifications, GitHub links, audit) are preserved for history. Deleted projects are excluded
from every read path (my projects, search, discover, pinned, analytics) and every resource
service rejects access to them; pending invitations can no longer be accepted. There is
intentionally no hard-delete cascade — no unrelated user data is ever touched.

### Public Landing Page API (`/api/public`)

Unauthenticated endpoints used by the marketing site. They return **only safe
aggregates** and admin-approved content — never emails, usernames, private project
data or internal ids.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/public/stats` | Aggregate platform statistics: users, projects, public projects, completed projects, tasks, tasks completed, members, messages, GitHub repos, approved reviews, average rating |
| GET | `/api/public/reviews` | Approved reviews (+ featured), rating summary and star distribution |
| GET | `/api/public/plans` | Active plan catalog (₹ pricing + entitlements) — drives the pricing page |

Every metric is a single indexed COUNT query computed server-side; nothing is loaded
into memory and nothing is hardcoded. The frontend shows the real numbers — including
zero — and never invents statistics.

### Billing (`/api/billing`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/billing/checkout` | User | Create a Razorpay order for a paid plan (plan NOT activated here) |
| GET | `/api/billing/subscription` | User | Current subscription (FREE when none/expired) |
| GET | `/api/billing/payments` | User | Own payment history (provider references only) |
| GET | `/api/billing/usage` | User | Plan usage: private projects, storage, members |
| POST | `/api/billing/cancel` | User | Cancel at period end (keeps paid access until then) |
| POST | `/api/billing/webhook/razorpay` | Public* | Razorpay webhook — *signature-verified, never trusted otherwise |
| GET | `/api/admin/billing/subscriptions` | Admin | Paginated subscription list (search/plan/status filters) |
| POST | `/api/admin/billing/subscriptions/{id}/cancel` | Admin | Admin cancel at period end (audit-logged) |

### Reviews & Feedback

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/reviews` | User | Submit a public review (starts `PENDING`) |
| GET | `/api/reviews/me` | User | Get my review (or 204-style empty) |
| PUT | `/api/reviews/me` | User | Edit my review (returns to `PENDING`) |
| POST | `/api/feedback` | User | Submit private feedback (starts `OPEN`) |
| GET | `/api/feedback/me` | User | List my private feedback with statuses |
| GET | `/api/admin/reviews` | Admin | Paginated review list (search + status filter) |
| PUT | `/api/admin/reviews/{id}/approve` | Admin | Approve a review (makes it public) |
| PUT | `/api/admin/reviews/{id}/reject` | Admin | Reject a review |
| PUT | `/api/admin/reviews/{id}/feature` | Admin | Feature/unfeature an **approved** review |
| DELETE | `/api/admin/reviews/{id}` | Admin | Delete a review |
| GET | `/api/admin/feedback` | Admin | Paginated private feedback list (status/category filters) |
| PUT | `/api/admin/feedback/{id}/status` | Admin | Move feedback through OPEN → IN_REVIEW → RESOLVED → CLOSED |

**Moderation workflow:** a submitted review is `PENDING` and is never served by
`/api/public/reviews`. An admin approves it to make it public, or rejects/deletes it.
Only `APPROVED` reviews can be featured. Edits by the author return the review to
`PENDING`. One review per user (DB unique constraint on `user_id`); reviewers can edit
their existing review instead of creating duplicates.

**Security:** the user id always comes from the JWT — never the request body. Ratings are
validated to 1–5 (both `@Valid` and service-level), comment length is capped, and
submissions are rate-limited (5 reviews / hour, 10 feedback / day per user) through the
shared `RateLimiter`. Public review responses expose only `displayName`, `username`,
avatar, `jobTitle`/`company` (only when the user actually provided them), rating,
comment, category and date — never email or account metadata. Every moderation action
(approve/reject/delete/feature/submit) writes an audit record.

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
| GET | `/api/messages/conversations` | Get all conversations (incl. unread counts) |
| GET | `/api/messages/room/{roomId}` | Get room messages |
| GET | `/api/messages/dm/{userId}` | Get DM conversation |
| POST | `/api/messages` | Send a message |
| POST | `/api/messages/dm/{userId}/read` | Mark a DM as read (returns unread count) |
| POST | `/api/messages/room/{roomId}/read` | Mark a room as read (returns unread count) |

**Message read state (V14):** every message carries a status — `SENT` (persisted),
`DELIVERED` (pushed over the real-time transport), `READ` (recipient opened the
conversation). DMs track read state on the message row (a DM has one recipient); room
messages use a per-user `message_reads` receipt table. `GET /api/messages/conversations`
returns per-conversation `unreadCount`; opening a conversation (or receiving a message
while it is open) marks the relevant messages read via the `POST …/read` endpoints.

**Authorization:** room messages require room participation (and an active, non-archived
project for project rooms); DMs are only visible to the two participants. A DM must target
a single existing, active account — sending to yourself, a deleted/blocked account, or an
unknown id is rejected, and a message must target exactly one of `roomId`/`receiverId`.

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
