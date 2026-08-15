# DevSync — Technical Interview Guide

Questions and answers for presenting DevSync in a technical interview. Every answer
reflects what is **actually implemented** — no hypothetical features.

---

## Why Spring Boot?

Spring Boot 3.4 on Java 21 gives us a production-grade baseline without reinventing
infrastructure:

- **Auto-configuration**: embedded Tomcat, JPA/Hibernate, validation, actuator, and
  security starters wire together in minutes, so we spent our effort on product logic.
- **Spring Security** is the de-facto standard for authN/authZ: filter chains,
  method/URL authorization, OAuth2 client support, and battle-tested CSRF/session
  handling. We needed JWT + OAuth2 + per-role authorization — all first-class.
- **Spring Data JPA** gives derived queries (`findByUserIdOrderByCreatedAtDesc`),
  `Page`/`Pageable` pagination, and `@Query` aggregation — most of our database access
  is declarative.
- **Testing**: `@SpringBootTest`, `@WebMvcTest`, `@DataJpaTest`, and `MockMvc` let us
  test at every level from unit to full HTTP against H2.
- **Ecosystem**: Flyway, actuator, WebSocket (STOMP), RestClient, and springdoc all
  integrate natively. The trade-off is startup weight and framework opinions, which is
  acceptable for a full-stack platform.

## Why JWT?

We needed a **stateless** API: the frontend and backend scale independently, and any
instance can validate a request without shared session storage.

- Access tokens (15 minutes by default) carry only `sub` (user id) + `type` + issuer —
  **no sensitive data** — and are verified for signature (HMAC-SHA256), expiry, issuer,
  and **token type** on every request.
- Refresh tokens (30 days) are exchanged at `/auth/refresh`; we deliberately enforce
  `type=refresh` so a refresh token can **never** be presented as an access token.
- Every request reloads the user from the DB, so **blocked/deleted accounts are
  rejected immediately** — the trade-off of that DB hit is correctness.
- Trade-offs: JWTs can't be revoked before expiry (logout is client-side; a blocklist
  would be the follow-up), and token storage in `localStorage` is XSS-sensitive.

## Why OAuth2?

Users shouldn't paste passwords. OAuth2 lets users authenticate with GitHub/Google and
lets us **connect their GitHub account for the integration feature** (repo linking,
commits, issues, PRs) with scoped tokens.

- Login OAuth is server-side: the browser hits `/oauth2/authorization/{provider}`, the
  backend exchanges the code, and JWT pairs come back in the **URL fragment** — never
  in server logs, history, or Referer headers.
- The GitHub integration uses its own flow with a single-use, expiring `state`
  parameter binding the callback to the user who started it. Tokens are **encrypted
  at rest** (AES-256-GCM) and never returned by any API.

## Why MySQL?

MySQL 8 is the pragmatic relational choice: ACID transactions for projects/members/
tasks, mature tooling, and simple ops. It fits relational data (users, projects,
boards, tasks, messages) well. We use:

- **Flyway** migrations for versioned schema (`V1..V17`), `ddl-auto: validate` in
  production so drift is caught at startup.
- Indexes on all FK and hot query paths (`created_at`, `owner_id`, `board_id`, …).
- GROUP BY aggregation queries for analytics instead of loading rows into memory.

The trade-off: heavy analytics at very large scale would move to a warehouse; MySQL is
excellent as the system of record.

## Why Flyway?

Schema changes are code reviews, not manual SQL. Every migration is versioned and
checksummed; CI and prod apply them deterministically. Rules we follow:

- Never edit an applied migration — always add `V{n+1}__...`.
- Test with H2 (`flyway: false`, `ddl-auto: create-drop`) and MySQL in CI.
- ENUMs are stored as `VARCHAR` so adding values needs no migration.

## Why WebSocket?

Chat, typing indicators, presence, and notifications need **server push**, which REST
polling can't do efficiently. We use STOMP over WebSocket with SockJS fallback:

- Broker destinations `/topic/*` (broadcast) and `/user/queue/*` (private).
- Typing indicators start on the first keystroke, auto-stop after 3s, stop on send
  and on disconnect, with all timers cleared on unmount.
- Presence tracks **sessions per user** so closing one tab doesn't mark a user
  offline; OFFLINE only fires when the last session drops.
- The reverse proxy forwards `Upgrade`/`Connection` headers with long timeouts — a
  classic deployment failure point that our nginx config handles.

## How does authorization work?

Three layers:

1. **Authentication** — `JwtAuthenticationFilter` validates the Bearer token
   (signature, issuer, expiry, `type=access`) and loads the user; blocked/deleted
   users fail here.
2. **Endpoint authorization** — `SecurityConfig` maps paths: `/api/admin/**` requires
   `ROLE_ADMIN`, `/api/auth/**` and webhooks are public, everything else is
   authenticated.
3. **Domain authorization** — services check ownership/membership/roles, e.g.
   `canViewProject` (owner | admin | member), `verifyBoardAccess` (owner | project
   admin/owner role), `getUserByIdWithAuth` (self | shared project | admin). This is
   where IDOR is prevented — never trusting the URL alone.

## How does ADMIN security work?

- `/api/admin/**` is guarded by `hasRole("ADMIN")` at the security layer, and every
  admin service method re-validates.
- The frontend `AdminRoute` is **UX-only**; a normal user hitting `/api/admin/**`
  gets 403 regardless of what the UI shows.
- **Self-protection**: an admin cannot block, demote, or delete themselves.
- **Last-admin protection**: the last active admin cannot be blocked, demoted, or
  deleted (enforced via `countByRoleAndDeletedFalseAndBlockedFalse`).
- Admin bootstrap is opt-in via `DEVSYNC_ADMIN_SEED_ENABLED` + credentials from the
  environment — there are no default credentials, and seeding never overwrites an
  existing admin.

## How are reports handled?

- Any authenticated user reports a `USER | PROJECT | POST | COMMENT | MESSAGE` entity
  with a reason; duplicates and nonexistent entities are rejected.
- Status lifecycle `PENDING → UNDER_REVIEW → RESOLVED|REJECTED` is enforced; terminal
  states are locked.
- Moderation actions are **validated per entity type** (BLOCK_USER only for user
  reports, HIDE_POST only for post reports, etc.); mismatches return 400.
- Every moderation action creates an audit record; resolving a report creates exactly
  one audit + one activity entry.

## How are audit logs generated?

A dedicated `AuditLogService` records security-sensitive events (login success/failure,
register, refresh, OTP, OAuth, role changes, block/unblock/delete, project archive/
restore/delete, moderation, GitHub connect/link). Each entry captures actor, target,
action, status, IP, device, browser, timestamp, and details. **Exactly-once** recording
is unit-tested, and tests assert details never contain passwords, tokens, or OTP codes.

## How is file upload secured?

Multiple layers:

- Multipart limits (10 MB file / 12 MB request) at both Spring and nginx.
- Extension allowlist with **exact matching** (a file named `evil.m` can't pass as
  `bmp`), plus **magic-byte sniffing** of the first 512 bytes — executables (MZ/ELF/
  shebang) are rejected even when disguised as `.png`; content that doesn't match its
  extension is rejected. Client MIME types are never trusted.
- Storage path is sanitized and normalized to prevent path traversal; files are served
  read-only with `nosniff`.

## How does GitHub integration work?

See the README architecture section: OAuth connect (single-use `state`, tokens
encrypted at rest), one-repo-per-project linking (owner/admin only, sets
`project.repositoryUrl`), commits/issues/PRs served to members on demand with a 60s
repo cache, and a signed webhook endpoint (HMAC-SHA256 verified, idempotent by
delivery id) that records push activity. 401 → reconnect prompt, 403 → rate-limit
message with reset time, 404 → repo gone.

## How would you scale DevSync?

- **Stateless API**: any number of backend replicas behind a load balancer; JWT means
  no session affinity. The in-memory rate limiter and OTP store are the current
  single-instance constraints — they'd move to Redis.
- **WebSocket**: a simple broker is fine for one instance; multi-node needs an external
  broker (RabbitMQ/STOMP) so messages fan out across nodes.
- **Database**: read replicas for the feed/analytics reads, connection pooling, and
  query tuning; the heavy aggregation queries are already single `GROUP BY` scans.
- **Static assets**: served by nginx/CDN with immutable caching.

## How would you handle 1 million users?

- **Auth**: Redis-backed rate limiting and OTP store; token blocklist for revocation;
  password hashing stays BCrypt (already costed).
- **Database**: vertical first (larger instance, indexes verified), then read replicas
  + a replica for analytics queries; archive old activity/audit rows with a documented
  retention policy (we intentionally do **not** auto-delete audit data today).
- **Frontend**: lazy-load the heavy admin/analytics routes; paginate every list (already
  done for admin, search, analytics, and notifications).
- **WebSocket**: external broker + horizontal scaling with presence moved to Redis.
- **Observability**: health endpoints on every node, Sentry for client errors, request
  logging, and alerting on `X-RateLimit-Reset` spikes.

## How would you improve database performance?

- Add a query log to find slow queries, then index or rewrite them; our analytics
  already use grouped aggregation instead of per-day loops.
- Keep list endpoints paginated (done) and avoid `findAll()` in user-facing paths (we
  removed a full-table load in user search this way).
- Use read replicas for analytics, and consider `COUNT`-heavy dashboard queries being
  cached for 30–60s — numbers that precise don't need to be live.

## How would you handle WebSocket scaling?

Replace the in-memory simple broker with an external STOMP broker (RabbitMQ) or
Redis pub/sub; each node subscribes to shared destinations and messages fan out to the
node hosting each session. Presence moves from in-memory session tracking to a shared
store with TTL heartbeats. The client already reconnects with SockJS fallback.

## How would you deploy the application?

Docker Compose today: nginx (frontend + reverse proxy) → backend → MySQL, with
healthchecks, named volumes, and env-driven config; CI builds and tests, CD (gated on
CI success) pushes images and SSH-deploys on version tags. For larger scale: Terraform
provisions the host/LB, `docker compose` or Kubernetes runs the stack, TLS terminates
at the LB, and MySQL gets automated off-box backups.

## What trade-offs did you make?

- **JWT statelessness vs revocation** — chose stateless. Access tokens are short-lived
  (15 min) so the exposure window is small, logout revokes the refresh-token family
  server-side, and every request reloads the user so blocked/deleted accounts are
  rejected immediately. A token blocklist is the documented follow-up if hard
  revocation of access tokens is ever needed.
- **In-memory rate limiting vs Redis** — simpler ops today; per-IP only and resets on
  restart. Documented as the first thing to replace.
- **Reloading the user on every request** — a DB hit per request buys immediate
  blocked/deleted enforcement; acceptable at this scale.
- **MySQL as the single store** — simple and correct; analytics-heavy scale would add
  a warehouse.
- **Token storage** — access tokens are short-lived (15 min) and kept client-side;
  refresh tokens live in an **HttpOnly, SameSite=Lax cookie** scoped to `/api/auth`,
  invisible to JavaScript and rotated on every refresh. This is the current
  implementation, not a future option.
- **Simple STOMP broker** — one node today; external broker when we go multi-node.
