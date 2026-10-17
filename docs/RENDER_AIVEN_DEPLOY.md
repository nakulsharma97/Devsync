# DevSync on Render + Aiven — free single-container deployment

Beginner runbook for deploying **this repository** to Render's Free instance with
**Aiven MySQL** as the external database. Every path, port, variable and endpoint
below was read from the code in this repo (see the audit at the end).

> Free tiers change. The limits quoted here were checked against the official
> Render and Aiven docs in **October 2026** — confirm them in the dashboards
> before you rely on them. Nothing in this guide requires a paid plan.

---

## 1. What gets deployed

One Render Docker web service built from the repository root:

```
Internet ──443──▶ Render TLS ──▶ nginx  :$PORT   (deploy/nginx.conf)
                                   ├── /            React SPA (Vite build)
                                   ├── /assets/     hashed static files
                                   ├── /api/        ─┐
                                   ├── /ws          ─┼─▶ Spring Boot 127.0.0.1:8080
                                   ├── /oauth2/     ─┤        │
                                   └── /login/      ─┘        ▼
                                                        Aiven MySQL (TLS)
```

- **Why one container:** the SPA is built with `VITE_API_URL=/api` and
  `VITE_WS_URL=/ws`, so it expects same-origin paths. Nginx already knows how to
  serve the SPA and proxy the API/WebSocket, so putting nginx and Spring Boot in
  one image needs **no application changes**.
- `backend/Dockerfile`, `frontend/Dockerfile` and `docker-compose.yml` are kept
  unchanged for the VPS/Compose path documented in
  [DEPLOYMENT.md](DEPLOYMENT.md).
- The Spring Boot process is **not** exposed publicly: only nginx listens on
  `$PORT`.

---

## 2. What you need before starting

| Item | Cost | Notes |
|---|---|---|
| GitHub account + this repo pushed | Free | Render deploys from a Git repo |
| Render account | Free | No credit card needed for the Free instance |
| Aiven account | Free | No credit card needed for the Free MySQL plan |
| Gmail account with 2-Step Verification | Free | Needed for signup OTP and password reset |
| Docker Desktop *(optional)* | Free | Only to test the image on your PC |

You do **not** need to install Java, Maven or Node to deploy — Render builds the
image from the Dockerfile.

---

## 3. Understand the `.env` question first

- **Never put real values in GitHub.** `.env` is gitignored; the repo tracks only
  `.env.example`, `frontend/.env.example` and `frontend/.env.development`
  (verified with `git ls-files`).
- **Nothing is uploaded as a secrets file.** Render pulls the code from GitHub
  and you paste values in **Render → your service → Environment**.
- The Aiven CA certificate is the one exception: it is uploaded as a **Render
  Secret File** named `aiven-ca.pem` (it is a public certificate, not a secret,
  but keeping it out of git is cleaner).
- `.env` in the repo root is only for local `docker compose` runs.

---

## 4. Step 1 — Create the Aiven MySQL database

1. Sign in at <https://console.aiven.io>.
2. **Create service** → **MySQL** → choose the **Free** plan.
3. Pick the region closest to your Render region (e.g. Mumbai / Singapore).
4. Name it `devsync-mysql` and create it. Wait until the state is **Running**.
5. Open the service → **Overview** → **Connection information**. Note:

| Field | Example | Used as |
|---|---|---|
| Host | `mysql-1a2b3c4d-devsync-mysql.d.aivencloud.com` | `SPRING_DATASOURCE_URL` |
| Port | `12345` | `SPRING_DATASOURCE_URL` |
| User | `avnadmin` | `SPRING_DATASOURCE_USERNAME` |
| Password | `AVNS_...` | `SPRING_DATASOURCE_PASSWORD` |
| Database | `defaultdb` | path segment of the JDBC URL |
| CA Certificate | *Download* button (`ca.pem`) | Render Secret File |

6. Also open **Databases** and confirm `defaultdb` exists (it is created by
   default). Do not create tables: **Flyway creates them on first boot.**

> Aiven may power off a free service after long inactivity. If the app suddenly
> cannot connect, check the Aiven console and power the service back on.

---

## 5. Step 2 — Generate `JWT_SECRET`

Any random 64-byte base64 string works. Generate it **locally**, never reuse it.

PowerShell:

```powershell
$b = New-Object byte[] 64
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
[Convert]::ToBase64String($b)
```

Git Bash / macOS / Linux:

```bash
openssl rand -base64 64
```

Copy the single-line output. This is `JWT_SECRET` — it signs access and refresh
tokens, and is also the fallback key for encrypting stored GitHub tokens.
Changing it later signs everybody out.

---

## 6. Step 3 — Gmail App Password (OTP emails)

Registration is **not** usable without SMTP: `PendingRegistrationService` sends
the 6-digit OTP and fails the request when email is not configured.

1. Enable 2-Step Verification: <https://myaccount.google.com/security>.
2. Open <https://myaccount.google.com/apppasswords>.
3. Create an app password for “Mail” → name it `DevSync`.
4. Copy the 16-character value (remove spaces) → `MAIL_PASSWORD`.
5. `MAIL_USERNAME` is the full Gmail address.

`MAIL_HOST=smtp.gmail.com`, `MAIL_PORT=587` are already the defaults, but set
them explicitly in Render.

---

## 7. Step 4 — Push the code to GitHub

The repo already has a `main` branch. If your remote is not set:

```bash
git remote -v                     # check whether origin exists
git add .
git commit -m "Add Render single-container deployment"
git remote add origin https://github.com/<your-username>/devsync.git
git push -u origin main
```

The new deployment files that must be present on GitHub:

- `Dockerfile` (repo root)
- `.dockerignore` (repo root)
- `deploy/nginx.conf`
- `deploy/start.sh`
- `deploy/render.env.example`
- `docs/RENDER_AIVEN_DEPLOY.md`

**Check:** on GitHub, open the repo root and confirm `Dockerfile` is there and
the `deploy/` folder contains all three files.

> Secrets check before pushing: `git status --short` should not list `.env`,
> `certs/`, or any filled-in env file. Current repo state: only templates are
> tracked.

---

## 8. Step 5 — Create the Render web service

1. <https://dashboard.render.com> → **New** → **Web Service**.
2. Connect GitHub and select this repository.
3. Fill in:

| Setting | Value |
|---|---|
| Name | `devsync` (becomes part of the URL) |
| Region | closest to your Aiven region |
| Branch | `main` |
| Root Directory | *(leave empty — repo root)* |
| Runtime / Language | **Docker** |
| Dockerfile Path | `./Dockerfile` |
| Docker Build Context Directory | `.` (repo root) |
| Instance Type | **Free** |
| Health Check Path | `/api/health` |
| Auto-Deploy | **Yes** |

4. **Advanced → Secret Files → Add Secret File**

| Filename | Contents |
|---|---|
| `aiven-ca.pem` | paste the entire downloaded `ca.pem` |

It is mounted read-only at `/etc/secrets/aiven-ca.pem`; `deploy/start.sh` imports
it into a PKCS12 truststore at boot so JDBC can use `sslMode=VERIFY_IDENTITY`.

5. **Environment → Add from .env** — paste the block below and replace the
   `REPLACE_*` values (this is the same content as
   [`deploy/render.env.example`](../deploy/render.env.example)):

```dotenv
SPRING_PROFILES_ACTIVE=prod
SPRING_DATASOURCE_URL=jdbc:mysql://REPLACE_AIVEN_HOST:REPLACE_AIVEN_PORT/defaultdb?sslMode=VERIFY_IDENTITY&trustCertificateKeyStoreUrl=file:/app/certs/aiven-truststore.p12&trustCertificateKeyStoreType=PKCS12&trustCertificateKeyStorePassword=changeit&serverTimezone=UTC&characterEncoding=UTF-8
SPRING_DATASOURCE_USERNAME=avnadmin
SPRING_DATASOURCE_PASSWORD=REPLACE_AIVEN_PASSWORD
JWT_SECRET=REPLACE_RANDOM_64_BYTE_BASE64
DEVSYNC_CORS_ORIGINS=https://REPLACE_APP.onrender.com
FRONTEND_URL=https://REPLACE_APP.onrender.com
DEVSYNC_COOKIE_SECURE=true
DEVSYNC_TRUST_X_FORWARDED_FOR=true
UPLOAD_DIR=/app/uploads
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=REPLACE_YOUR_ADDRESS@gmail.com
MAIL_PASSWORD=REPLACE_GMAIL_APP_PASSWORD
DEVSYNC_ADMIN_SEED_ENABLED=false
```

Render injects `PORT` itself — **do not** set it manually.

6. Create the service. The first Docker build compiles Maven + Vite, so expect
   roughly 5–12 minutes.

---

## 9. Step 6 — Environment variable reference

Exact names as referenced by the code.

### Required to boot

| Variable | Source / value |
|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` (enables secure cookies + HSTS + fail-fast checks) |
| `SPRING_DATASOURCE_URL` | template above, Aiven host/port |
| `SPRING_DATASOURCE_USERNAME` | `avnadmin` |
| `SPRING_DATASOURCE_PASSWORD` | Aiven password |
| `JWT_SECRET` | generated in Step 2 |

`application-prod.yml` declares these without defaults, so a missing one aborts
startup with the **variable name** in the log (values are never printed).

### Required for a usable app

| Variable | Why |
|---|---|
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` | signup OTP, password reset, email verification |
| `DEVSYNC_CORS_ORIGINS` | exact public origin, no trailing slash |
| `FRONTEND_URL` | reset/verify links and OAuth success redirect |
| `DEVSYNC_COOKIE_SECURE` | `true` (Render is HTTPS) |
| `UPLOAD_DIR` | `/app/uploads` |

### Optional / feature-specific

| Variable | Effect when unset |
|---|---|
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | checkout returns **503 Payment not configured**; everything else works |
| `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL` | Stripe checkout disabled |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_REDIRECT_URI`, `GITHUB_WEBHOOK_SECRET`, `GITHUB_TOKEN_ENCRYPTION_KEY` | GitHub repo integration disabled |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google login unavailable |
| `DEVSYNC_ADMIN_SEED_ENABLED`, `DEVSYNC_ADMIN_EMAIL`, `DEVSYNC_ADMIN_PASSWORD` | no admin is created |
| `DEVSYNC_JWT_ACCESS_EXPIRATION_MS` (900000), `DEVSYNC_JWT_REFRESH_EXPIRATION_MS` (2592000000) | defaults used |
| `DEVSYNC_WS_RATE_LIMIT_ENABLED` (true), `_MAX_MESSAGES` (120), `_MAX_SUBSCRIPTIONS` (30) | defaults used |
| `DEVSYNC_RATE_LIMIT_INVITE_PER_MINUTE` (10) | default used |
| `UPLOAD_MAX_SIZE` (10485760) | default used |
| `LOG_LEVEL_DEV_SYNC`, `LOG_LEVEL_SECURITY` | INFO |

### Social login needs an extra profile

`application-oauth.yml` **only** loads with the `oauth` profile, and it declares
`${GITHUB_CLIENT_ID}` / `${GOOGLE_CLIENT_ID}` **without defaults**. So social
login requires:

```dotenv
SPRING_PROFILES_ACTIVE=prod,oauth
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

Setting only GitHub credentials with `oauth` active will fail startup (missing
Google placeholders). If you only need the GitHub *integration* (not login),
leave the profile as `prod` and set `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` /
`GITHUB_REDIRECT_URI` only.

---

## 10. Step 7 — Watch the first deploy

Render → your service → **Logs**. Look for, in order:

1. `[start] Importing /etc/secrets/aiven-ca.pem into /app/certs/aiven-truststore.p12`
2. Flyway lines such as `Migrating schema 'defaultdb' to version "1 - init"` … up
   to `"29 - create refund requests"`.
3. `Started DevSyncApplication in ... seconds`
4. Nginx access logs for the health check: `GET /api/health`.

If the service is marked **Live**, open
`https://<your-app>.onrender.com/api/health` — it must return
`{"status":"UP","service":"devsync-backend",...}`.

---

## 11. Step 8 — Verify the deployment

| # | Check | Expected |
|---|---|---|
| 1 | `GET /api/health` | `status: UP` |
| 2 | Open `/` | landing page, no console errors |
| 3 | Open `/auth` → register | 6-digit OTP email arrives |
| 4 | Verify OTP | dashboard loads, refresh keeps you signed in |
| 5 | Open chat / project messages | WebSocket connects (DevTools → Network → WS `/ws`) |
| 6 | Upload a file | downloads through `/api/attachments/...` |
| 7 | Aiven console → SQL | tables like `users`, `projects`, `flyway_schema_history` exist |

Database check that needs no local client: Aiven console → **Query editor**
(or connect with any MySQL client using the same TLS settings) and run
`SELECT COUNT(*) FROM flyway_schema_history;` — it must be **29**.

---

## 12. Step 9 — Point OAuth apps and webhooks at the Render URL

Use the final URL (custom domains work the same way). These are the paths the
code actually uses.

| Provider | Where | Value |
|---|---|---|
| GitHub OAuth App | GitHub → Settings → Developer settings → OAuth Apps | Homepage `https://APP.onrender.com`; callback `https://APP.onrender.com/login/oauth2/code/github` **and** `https://APP.onrender.com/api/github/callback` |
| Google OAuth client | Google Cloud Console → Credentials → OAuth client ID (Web application) | Redirect URI `https://APP.onrender.com/login/oauth2/code/google` |
| Razorpay webhook | Razorpay Dashboard → Settings → Webhooks | `https://APP.onrender.com/api/billing/webhook/razorpay`, secret = `RAZORPAY_WEBHOOK_SECRET` |
| Stripe webhook | Stripe Dashboard → Developers → Webhooks | `https://APP.onrender.com/api/billing/webhook/stripe` |
| GitHub repo webhook (per linked repo) | Repo → Settings → Webhooks | `https://APP.onrender.com/api/webhooks/github`, secret = `GITHUB_WEBHOOK_SECRET` |

After changing variables in Render, save — Render redeploys automatically. No
rebuild is needed for backend env changes, but `VITE_*` values are baked into the
frontend at **build** time.

---

## 13. Step 10 — Create the first admin (one time)

1. Render → Environment → set:
   `DEVSYNC_ADMIN_SEED_ENABLED=true`, `DEVSYNC_ADMIN_EMAIL`, `DEVSYNC_ADMIN_PASSWORD` (≥ 8 chars).
2. Save and wait for the redeploy; logs show the admin was created.
3. **Immediately** set `DEVSYNC_ADMIN_SEED_ENABLED=false` and save again.
4. Sign in at `/auth`, then open `/admin/dashboard`.

---

## 14. Optional — test the image locally

```bash
# from the repo root, with Docker Desktop running
docker build -t devsync:local .

docker run --rm -p 10000:10000 \
  --env-file .env.deploy \
  -v "$PWD/aiven-ca.pem:/etc/secrets/aiven-ca.pem:ro" \
  -v devsync-uploads:/app/uploads \
  devsync:local
```

`.env.deploy` is a **local, gitignored** copy of `deploy/render.env.example`
with real values, but change the URLs to `http://localhost:10000` for CORS.

Then open <http://localhost:10000> and repeat the Step 8 checks.

---

## 15. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Build fails at `bun install --frozen-lockfile` | `frontend/bun.lock` out of sync with `package.json` | run `bun install` locally and commit the updated `bun.lock` |
| `Production startup aborted: ... configuration problem(s)` | prod validator: dev JWT secret, DB password `12345`, half-configured SMTP/GitHub | log names the variable — fix it in Render → Environment |
| `ERROR: SPRING_DATASOURCE_URL points at ... but /etc/secrets/aiven-ca.pem is missing` | Secret File not added / wrong filename | add it with exactly `aiven-ca.pem` |
| `ERROR: keytool could not import the CA certificate` | file is not a PEM certificate | re-download **CA Certificate** from Aiven (not the client key) |
| `SSLHandshakeException` / `CertificateException` | hostname mismatch or wrong CA | use the Aiven project CA and the exact host from the console |
| `Communications link failure` | wrong host/port, or Aiven service powered off | check the console; confirm the service is **Running** |
| `Access denied for user 'avnadmin'` | wrong password / database name | re-copy from Aiven; database is usually `defaultdb` |
| Health check fails, logs show `502` | backend still starting (Flyway on first boot) | wait; Render retries during `start-period` |
| Cookie not set / logged out on refresh | wrong `DEVSYNC_COOKIE_SECURE` or CORS origin | keep `true`, set `DEVSYNC_CORS_ORIGINS=https://APP.onrender.com` (no trailing slash) |
| `403` on POST after login | CSRF cookie blocked | confirm you are on the HTTPS Render URL, not a plain-HTTP proxy |
| WebSocket fails (`/ws` 404 or stalls) | proxy path changed | `/ws` must stay a bare prefix in `deploy/nginx.conf` |
| GitHub/Google button → 404 | `oauth` profile not active | `SPRING_PROFILES_ACTIVE=prod,oauth` **and** all four credentials |
| Uploads disappear after a redeploy | Render Free has no persistent disk | expected — see limitations |
| App slow on first request | Free instance slept after 15 min | cold start ≈ 1 minute |
| Theme flashes / console shows `Refused to execute inline script` | the CSP hash in `deploy/nginx.conf` no longer matches the inline theme script in `frontend/index.html` | recompute the SHA-256 of that inline script and update `script-src` (the file is `frontend/index.html`, served as-is in `dist/index.html`) |
| `OutOfMemoryError` | 512 MB instance | image already sets `-XX:MaxRAMPercentage=50`; reduce heap via `JAVA_OPTS=-Xmx256m` |
| Aiven: `too many connections` | free plan allows 76 | ensure only one Render instance is running |

---

## 16. Free-tier limitations (know these before sharing the link)

- **Render Free:** 512 MB RAM, 0.1 CPU, 750 instance-hours/month per workspace,
  spins down after **15 minutes** without traffic (WebSocket messages count as
  traffic), cold start ≈ 1 minute. Bandwidth is limited on the Hobby workspace.
- **Aiven Free MySQL:** 1 GB RAM, 1 GB storage, 76 connections, no credit card.
  Aiven may power off a service that stays inactive.
- **Uploads are ephemeral.** `FileStorageService` writes to
  `app.upload.dir` inside the container; Render Free has no persistent disk, so
  files vanish on redeploy/restart. For real persistence you need object storage
  (e.g. R2/S3) — that is an application change and is deliberately **not** made
  here. Confirm with the project owner before adding a storage provider.
- **Single instance only.** Rate limiters, OTP codes and presence are in-memory.
  Do not scale Render above one instance.
- **Payments:** without Razorpay keys checkout returns 503. Sandbox keys
  (`rzp_test_*`) are enough to demo billing.

---

## 17. Audit summary (what was verified in this repo)

| Area | Finding |
|---|---|
| Java / Spring Boot | Java **21**, Spring Boot **3.4.13** (`backend/pom.xml`) |
| Backend build | Maven wrapper 3.9.x; `mvn package` → `backend/target/devsync-backend-1.0.0.jar` |
| Frontend | React 19 + Vite 7, **bun** (`frontend/bun.lock`) / npm; `bun run build` (`tsc -b && vite build`) |
| Frontend output | `vite.config.ts` sets `outDir: "../dist"` — from `frontend/` the build lands in the repo-root `dist/`, which is what both Dockerfiles copy |
| Existing Docker | `backend/Dockerfile` exposes 8080; `frontend/Dockerfile` serves on 8080 behind nginx (`frontend/nginx.conf`) and expects `http://backend:8080` (Compose DNS) |
| Health | `GET /api/health` (`HealthController`), permitted without auth |
| API / WS | same-origin `/api` and `/ws` defaults in `frontend/src/services/api.ts` and `websocketService.ts` |
| Auth | JWT access/refresh in HttpOnly cookies, CSRF via `XSRF-TOKEN` cookie + `X-XSRF-TOKEN` header; `DEVSYNC_COOKIE_SECURE=true` required behind HTTPS |
| CORS | `app.cors.allowed-origins` ← `DEVSYNC_CORS_ORIGINS`; WS handshake uses `setAllowedOriginPatterns("*")` and authenticates on STOMP CONNECT |
| Uploads | local filesystem (`app.upload.dir`), downloads through authenticated `/api/attachments/{id}/download` — no public `/uploads` route |
| Migrations | Flyway V1–V29, `baseline-on-migrate: true`, `ddl-auto: validate` |
| Prod profile | requires datasource + `JWT_SECRET`; **Razorpay was mandatory** even with no payment account → relaxed to optional in `application-prod.yml`; checkout now returns 503 |
| Social login | requires the `oauth` profile; registers GitHub and Google without defaults |
| Secrets in git | none — only `.env.example`, `frontend/.env.example`, `frontend/.env.development` are tracked |
