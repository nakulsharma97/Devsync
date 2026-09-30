# DevSync — Deployment Guide

Everything you need to ship this project: **which API keys to obtain**, **where to
deploy**, a **command-by-command runbook** (empty server → HTTPS), and the
**configuration bugs to fix first**.

Every key name and config claim below was verified against the actual code —
`backend/src/main/resources/application*.yml`, `docker-compose.yml`,
`frontend/Dockerfile` and `.github/workflows/cd.yml` — not from memory.

**Contents**

1. [API keys & secrets](#1-api-keys--secrets) — full inventory, and where each one lives
2. [Where to deploy](#2-where-to-deploy)
3. [Step-by-step runbook](#3-step-by-step-runbook) — the hands-on part
4. [Troubleshooting](#4-troubleshooting)
5. [Verified problems to fix before going live](#5-verified-problems-to-fix-before-going-live)
6. [Non-negotiable rules](#6-non-negotiable-rules)
7. [Condensed quick reference](#7-condensed-quick-reference)

> **Never commit real values.** `.env` and `certs/` are gitignored. Only variable
> *names* belong in this file.

---

## 1. API keys & secrets

### 1.1 Required to boot the Docker stack

Declared `:?` in `docker-compose.yml`, so `docker compose up` refuses to start
without them:

| Variable | What it is | Where to get it |
|---|---|---|
| `JWT_SECRET` | Signs access + refresh JWTs. Also the fallback key for encrypting GitHub tokens at rest. | `openssl rand -base64 64` |
| `MYSQL_ROOT_PASSWORD` | Root password for the MySQL container. Used by nothing but MySQL itself. | Invent one (32+ random chars) |
| `MYSQL_PASSWORD` | Password for the dedicated `devsync` DB user. The app never connects as root. | Invent one (32+ random chars) |
| `RAZORPAY_KEY_ID` | Razorpay API key. **Required even if you never charge anyone** — see [§5.5](#55-razorpay-keys-are-mandatory-even-if-you-never-take-a-payment). | Razorpay Dashboard → Settings → API Keys (`rzp_test_*` sandbox, `rzp_live_*` real) |
| `RAZORPAY_KEY_SECRET` | Razorpay API secret. | Same page |
| `RAZORPAY_WEBHOOK_SECRET` | Verifies `X-Razorpay-Signature` on webhooks. | Razorpay Dashboard → Settings → Webhooks (you choose it) |

`SPRING_DATASOURCE_URL` / `_USERNAME` / `_PASSWORD` need **no key**: compose
hardcodes the URL and username and maps the password from `MYSQL_PASSWORD`.

### 1.2 Email — needed for every code and link the app sends

Without these the app boots fine but OTP, magic-code login, password reset and
email verification **silently fail to send**.

| Variable | Default | Where to get it |
|---|---|---|
| `MAIL_HOST` | `smtp.gmail.com` | Your SMTP provider |
| `MAIL_PORT` | `587` | Your SMTP provider |
| `MAIL_USERNAME` | — | The sending mailbox address |
| `MAIL_PASSWORD` | — | Gmail: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) → 16-char App Password (2-Step Verification required). **Not** your account password. |

### 1.3 Social login (OAuth)

| Variable | Callback to register | Where to get it |
|---|---|---|
| `GITHUB_CLIENT_ID` | `https://<domain>/login/oauth2/code/github` | [github.com/settings/developers](https://github.com/settings/developers) → New OAuth App |
| `GITHUB_CLIENT_SECRET` | (same app) | Same page |
| `GOOGLE_CLIENT_ID` | `https://<domain>/login/oauth2/code/google` | [console.cloud.google.com](https://console.cloud.google.com/apis/credentials) → Credentials → OAuth client ID → Web application |
| `GOOGLE_CLIENT_SECRET` | (same client) | Same page |

⚠️ **Credentials alone are not enough** — the `oauth` Spring profile must also be
active, and the Google pair isn't forwarded by compose. See
[§5.1](#51-social-login-is-dead-in-the-docker-deployment) and
[§5.2](#52-docker-composeyml-does-not-forward-every-variable).

### 1.4 GitHub integration (repo linking, commits / issues / PRs)

Reuses `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` from §1.3.

| Variable | What it is | Where to get it |
|---|---|---|
| `GITHUB_REDIRECT_URI` | Public callback for the *integration* flow, e.g. `https://<domain>/api/github/callback`. Add it to the OAuth App too. | You compose it |
| `GITHUB_WEBHOOK_SECRET` | Verifies `X-Hub-Signature-256` on repo webhooks. | `openssl rand -hex 32`, then paste into each repo's webhook settings |
| `GITHUB_TOKEN_ENCRYPTION_KEY` | Encrypts stored GitHub tokens at rest. Falls back to `JWT_SECRET`. | `openssl rand -base64 32` |

### 1.5 Payments — Stripe (optional, second provider)

Razorpay is the default. Stripe is entirely optional; leave it blank to disable
(checkout returns `503 Stripe payment is not configured`).

| Variable | Where to get it |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys (`sk_test_*` / `sk_live_*`) |
| `STRIPE_PUBLISHABLE_KEY` | Same page (`pk_*`) |
| `STRIPE_WEBHOOK_SECRET` | Developers → Webhooks → endpoint `https://<domain>/api/billing/webhook/stripe` → signing secret (`whsec_*`) |

### 1.6 Frontend — build-time, not secrets

Vite inlines `VITE_*` into the bundle **at build time**, so these are Docker
**build args**, not runtime secrets. Changing them requires a rebuild.

| Variable | Default | Notes |
|---|---|---|
| `VITE_API_URL` | `/api` | Keep same-origin; the bundled nginx proxies `/api` to the backend |
| `VITE_WS_URL` | `/ws` | Same — `ws`/`wss` derives from the page protocol |
| `VITE_SENTRY_DSN` | *(unset)* | Frontend error tracking. ⚠️ Currently impossible to set in Docker — see [§5.3](#53-vite_sentry_dsn-can-never-be-set) |

### 1.7 Optional tuning (all have safe defaults)

| Variable | Default | Notes |
|---|---|---|
| `DEVSYNC_CORS_ORIGINS` | localhost origins | **Set this** to your real origin or the SPA cannot call the API |
| `FRONTEND_URL` | `http://localhost:5173` | Origin used in reset/verify email links and the OAuth success redirect |
| `DEVSYNC_COOKIE_SECURE` | `true` in compose | Leave `true` behind HTTPS |
| `DEVSYNC_ADMIN_SEED_ENABLED` / `_EMAIL` / `_PASSWORD` | `false` / empty | One-time bootstrap admin. Set back to `false` after first boot |
| `DEVSYNC_JWT_ACCESS_EXPIRATION_MS` | `900000` (15 min) | |
| `DEVSYNC_JWT_REFRESH_EXPIRATION_MS` | `2592000000` (30 days) | |
| `DEVSYNC_WS_RATE_LIMIT_ENABLED` / `_MAX_MESSAGES` / `_MAX_SUBSCRIPTIONS` | `true` / `120` / `30` | In-memory buckets — single instance only |
| `RAZORPAY_BASE_URL` | `https://api.razorpay.com` | Override for sandbox |
| `DEVSYNC_TRUST_X_FORWARDED_FOR` | hardcoded `true` in compose | Correct: the app is always behind nginx |
| `UPLOAD_DIR` | hardcoded `/app/uploads` in compose | Backed by the `uploads` volume |

`ProductionConfigValidator` (prod profile only) aborts startup when it sees a dev
fallback JWT secret, the dev DB password `12345`, half-configured SMTP, admin
seeding without credentials, or half-configured GitHub/OAuth credentials. It logs
the offending variable **names**, never values.

### 1.8 Where each key lives

| Layer | Mechanism | Which keys |
|---|---|---|
| Deploy host | `/opt/devsync/.env` | **All** backend + compose keys. `docker compose` reads it automatically; the CD workflow never passes secrets over SSH. |
| Docker build | `frontend` build args | `VITE_API_URL`, `VITE_WS_URL` |
| GitHub Actions | repo **secrets** | `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_KEY` — CI/CD plumbing only, never app secrets |
| GitHub Actions | repo **variable** | `DEPLOY_URL` (the link shown on the deploy run) |

CI itself needs only `JWT_SECRET`, and the workflow supplies a throwaway value.
Tests run on H2 and mock every external provider, so **no real API key is needed
to run the test suite**.

---

## 2. Where to deploy

The app is three containers (MySQL 8 + Spring Boot + nginx-served React) with one
stateful volume each for MySQL and uploads. **Any Docker host works.**

```
Internet ──443──▶ Caddy (TLS, host) ──▶ nginx :8080 (SPA + /api proxy)
                                              │
                                              └──▶ Spring Boot :8080 ──▶ MySQL 8 (TLS)
```

| Option | Fit |
|---|---|
| **Docker Compose on a Linux VPS** (Hetzner / DigitalOcean / Lightsail / EC2) | **The designed path.** `docker-compose.yml`, `scripts/server-deploy.sh` and the CD workflow all assume it. 2 GB RAM, 2 vCPU is enough. |
| GitHub Actions CD → that VPS | Already wired: tag `v*` → build/push to GHCR → SSH deploy, gated by manual approval. See [Step 13](#step-13--ongoing-deploys). |
| Managed platforms (Fly.io / Render / Railway / ECS) | Possible, but you must externalise MySQL, replace the compose networking, and move uploads to object storage. Not turnkey. |

Only the **frontend** container publishes a port. MySQL and the backend stay on
the internal `devsync-net` bridge. TLS is expected to terminate *in front of* the
stack — nothing in this repo obtains a certificate. [Step 8](#step-8--put-https-in-front-caddy)
sets up Caddy for that.

**Scale-out ceiling:** the JWT rate limiter, WebSocket rate limiter and presence
state are all in-memory, so a second backend replica would behave incorrectly.
Compose even ships a commented-out Redis service for that future move.

---

## 3. Step-by-step runbook

Every step has a command and a **✅ Check** so you know it worked before moving on.
Time: ~45 minutes for a first deploy.

### Step 0 — Before you start

| You need | Notes |
|---|---|
| A Linux server | Ubuntu 22.04 / 24.04, **2 GB RAM minimum**, 20 GB disk |
| A domain | `A` records for `yourdomain.com` (and `www`) → server IP. Create this **first**; DNS propagates while you work |
| Root SSH access | `ssh root@SERVER_IP` must work |
| A GitHub account | For the repo, OAuth login, and the optional CD pipeline |
| A Razorpay account | **Required** — see [§5.5](#55-razorpay-keys-are-mandatory-even-if-you-never-take-a-payment). Sandbox is fine |
| A Gmail account | For OTP / password-reset emails (App Password) |

> ⚠️ **RAM reality check.** MySQL + Spring Boot + nginx on 1 GB will OOM during
> the first build. Use 2 GB, or add swap (Step 1.5).

### Step 1 — Prepare the server

```bash
ssh root@SERVER_IP

# 1.1 System update
apt update && apt upgrade -y

# 1.2 A non-root user (deploying as root works but is bad practice)
adduser devsync
usermod -aG sudo devsync
mkdir -p /home/devsync/.ssh
cp ~/.ssh/authorized_keys /home/devsync/.ssh/
chown -R devsync:devsync /home/devsync/.ssh
chmod 700 /home/devsync/.ssh && chmod 600 /home/devsync/.ssh/authorized_keys

# 1.3 Docker Engine + compose plugin
curl -fsSL https://get.docker.com | sh
usermod -aG docker devsync

# 1.4 Firewall — Caddy needs 80 and 443
apt install -y ufw
ufw allow OpenSSH && ufw allow 80 && ufw allow 443
ufw --force enable

# 1.5 Swap, only if you have 2 GB RAM or less
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

Log out and back in as `devsync` so the `docker` group applies:

```bash
exit
ssh devsync@SERVER_IP
docker run --rm hello-world
```

**✅ Check:** `docker run` prints "Hello from Docker!" and `docker compose version`
prints a version — both **without** `sudo`.

### Step 2 — Put the code on the server

```bash
sudo mkdir -p /opt/devsync
sudo chown $USER:$USER /opt/devsync
git clone <REPO_URL> /opt/devsync
cd /opt/devsync
```

**✅ Check:** `ls docker-compose.yml scripts/server-deploy.sh` lists both, and
`git log --oneline -1` shows the commit you expect.

> `/opt/devsync` is the convention: `scripts/server-deploy.sh` defaults to it and
> the CD workflow expects it.

### Step 3 — Create the secrets file

Generate strong values **on the server** (never reuse your laptop's):

```bash
cd /opt/devsync
echo "JWT_SECRET          = $(openssl rand -base64 64)"
echo "MYSQL_ROOT_PASSWORD = $(openssl rand -base64 24)"
echo "MYSQL_PASSWORD      = $(openssl rand -base64 24)"
echo "GITHUB_TOKEN_KEY    = $(openssl rand -base64 32)"
echo "GITHUB_WEBHOOK_SEC  = $(openssl rand -hex 32)"
```

Then create the file (`cp .env.example .env` lists every option with comments):

```bash
cp .env.example .env
nano .env
```

Paste this, filling in what you generated:

```bash
# ── required to boot ────────────────────────────────────────
JWT_SECRET=<paste>
MYSQL_ROOT_PASSWORD=<paste>
MYSQL_PASSWORD=<paste>

# Razorpay is MANDATORY even if you never charge anyone — compose refuses
# to start without all three. Use sandbox keys to begin.
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=<from Razorpay dashboard>
RAZORPAY_WEBHOOK_SECRET=<paste the value you invented>

# ── your domain ─────────────────────────────────────────────
DEVSYNC_CORS_ORIGINS=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com

# ── email (OTP / password reset) ────────────────────────────
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=you@gmail.com
MAIL_PASSWORD=<16-char Gmail App Password>

# ── GitHub integration (optional for now) ───────────────────
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=https://yourdomain.com/api/github/callback
GITHUB_WEBHOOK_SECRET=<paste>
GITHUB_TOKEN_ENCRYPTION_KEY=<paste>

# ── social login (optional) ─────────────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ── leave these alone ───────────────────────────────────────
DEVSYNC_COOKIE_SECURE=true
DEVSYNC_ADMIN_SEED_ENABLED=false
```

```bash
chmod 600 .env
```

**✅ Check:** `grep -c '^[A-Z]' .env` reports ~21, and `chmod 600 .env` succeeded.

### Step 4 — Generate the MySQL TLS certificates

The prod stack connects with `sslMode=VERIFY_CA`, so certificates must exist
**before** the first boot:

```bash
cd /opt/devsync
./scripts/generate-db-certs.sh
ls -l certs/
```

**✅ Check:** `certs/` contains all five files — `ca.pem`, `ca-key.pem`,
`server-cert.pem`, `server-key.pem`, `backend-truststore.p12`.

> The script needs `keytool`; without a JDK it borrows one from an
> `eclipse-temurin` container. It also fixes file ownership, because the MySQL
> container runs as uid 999 and must read `server-key.pem`.

### Step 5 — Pre-flight edits (do not skip)

Three changes fix problems shipped in the repo. Open `docker-compose.yml`:

```bash
nano docker-compose.yml
```

**5a. Enable social login.** With only the `prod` profile the
`/oauth2/authorization/*` endpoints don't exist, so the GitHub/Google buttons on
`/auth` return 404. In the backend `environment:` block:

```yaml
      SPRING_PROFILES_ACTIVE: prod,oauth
```

**5b. Forward the Google credentials.** They're missing from compose, so putting
them in `.env` does nothing. Next to the existing `GITHUB_*` lines, add:

```yaml
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:-}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET:-}
```

**5c. Bind the frontend to loopback only.** Caddy (Step 8) needs ports 80/443,
but the frontend container currently occupies port 80. In the `frontend`
service:

```yaml
    ports:
      - "127.0.0.1:8080:8080"
```

**✅ Check:** `docker compose config --quiet` prints nothing and exits 0.

### Step 6 — First boot

```bash
cd /opt/devsync
docker compose up -d --build
```

The first build takes 5–10 minutes (it compiles the backend and builds the SPA).

```bash
docker compose ps
```

**✅ Check:** all three eventually show `healthy`:

```
NAME                SERVICE    STATUS
devsync-backend-1   backend    Up 2 minutes (healthy)
devsync-frontend-1  frontend   Up 2 minutes (healthy)
devsync-mysql-1     mysql      Up 3 minutes (healthy)
```

Watch the backend boot:

```bash
docker compose logs -f backend     # Ctrl+C to stop following
```

Look for Flyway migrations and `Started DevSyncApplication`. First-boot failures
are covered in [§4](#4-troubleshooting).

### Step 7 — Verify from the server

```bash
curl -fsS http://127.0.0.1:8080/api/health
curl -fsS -o /dev/null -w 'frontend HTTP %{http_code}\n' http://127.0.0.1:8080/
curl -fsS http://127.0.0.1:8080/api/public/plans | head -c 200
```

**✅ Check:** health returns `{"status":"UP",...}`, frontend returns `HTTP 200`,
and plans returns JSON (proves nginx proxies `/api` correctly).

Confirm the database really migrated over TLS:

```bash
docker compose exec -T mysql sh -c \
  'mysql -u root -p"$MYSQL_ROOT_PASSWORD" -h 127.0.0.1 -N -B \
   -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=\"devsync_db\";"'
```

**✅ Check:** a number greater than 0 (the Flyway-created tables).

### Step 8 — Put HTTPS in front (Caddy)

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

Replace `/etc/caddy/Caddyfile` (`sudo nano /etc/caddy/Caddyfile`) with:

```
yourdomain.com, www.yourdomain.com {
    encode gzip
    reverse_proxy 127.0.0.1:8080
}
```

```bash
sudo systemctl reload caddy
sudo journalctl -u caddy -n 30 --no-pager   # watch the certificate get issued
```

**✅ Check:** all three pass —

```bash
curl -I https://yourdomain.com                 # -> HTTP/2 200
curl -sI https://yourdomain.com | grep -i strict-transport-security
curl -s https://yourdomain.com/api/health
```

DNS must already point at the server or ACME fails. Caddy handles the WebSocket
upgrade and certificate renewal automatically.

> **Already using Cloudflare or an external load balancer?** Skip Caddy and keep
> `80:8080` — but set Cloudflare's SSL mode to **Full (strict)**, never Flexible,
> or cookies and redirects break.

### Step 9 — Browser smoke test

Open `https://yourdomain.com` and walk through:

1. Landing page loads, no mixed-content errors in the console.
2. `/auth` renders and the layout looks right.
3. **Register** → a 6-digit code arrives by email → verify → you land on the dashboard.
4. Refresh — you stay signed in (proves the refresh cookie works over HTTPS).
5. Sign out, sign back in.
6. Open chat/notifications to confirm the WebSocket connects (`/ws`).

If OTP emails don't arrive, that's the `MAIL_*` values — see [§4](#4-troubleshooting).

### Step 10 — Bootstrap the first admin (one-time)

```bash
cd /opt/devsync
nano .env     # set these three:
#   DEVSYNC_ADMIN_SEED_ENABLED=true
#   DEVSYNC_ADMIN_EMAIL=ops@yourdomain.com
#   DEVSYNC_ADMIN_PASSWORD=<a-strong-unique-password>

docker compose up -d backend
docker compose logs backend | grep -i -A2 'admin'
```

**✅ Check:** the log confirms the admin was created, then **immediately** turn
seeding back off so a changed `.env` can never recreate it:

```bash
nano .env     # DEVSYNC_ADMIN_SEED_ENABLED=false
docker compose up -d backend
```

Sign in and confirm `/admin/dashboard` loads.

### Step 11 — Register the third-party callbacks

Now that the domain is live, point the providers at it.

| Provider | Where | Value |
|---|---|---|
| GitHub OAuth App | Settings → Developer settings → OAuth Apps | Homepage `https://yourdomain.com`; callbacks `https://yourdomain.com/login/oauth2/code/github` **and** `https://yourdomain.com/api/github/callback`. Copy ID/secret into `.env` as `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` |
| Google OAuth client | Cloud Console → APIs & Services → Credentials → OAuth client ID (Web application) | Redirect URI `https://yourdomain.com/login/oauth2/code/google` → `.env` as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` |
| Razorpay webhook | Settings → Webhooks | URL `https://yourdomain.com/api/billing/webhook/razorpay`, secret = `RAZORPAY_WEBHOOK_SECRET`. Events: `payment.captured`, `payment.failed`, `payment.refunded`, `order.paid`, `subscription.activated`, `subscription.charged`, `subscription.cancelled`, `subscription.expired` |
| Stripe webhook *(optional)* | Developers → Webhooks | URL `https://yourdomain.com/api/billing/webhook/stripe` → `.env` as `STRIPE_WEBHOOK_SECRET` (+ `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY`) |
| GitHub repo webhook *(per linked repo)* | Repo → Settings → Webhooks | URL `https://yourdomain.com/api/webhooks/github`, secret = `GITHUB_WEBHOOK_SECRET` |

Apply the `.env` changes:

```bash
docker compose up -d
```

**✅ Check:** the GitHub and Google buttons on `/auth` now reach a real consent
screen instead of a 404. Sandbox payment walkthroughs: [PAYMENT_TESTING.md](PAYMENT_TESTING.md).

### Step 12 — Backups

MySQL isn't published to the host, so dump from inside the container:

```bash
cd /opt/devsync
mkdir -p backups
docker compose exec -T mysql sh -c \
  'exec mysqldump --single-transaction --routines -u root -p"$MYSQL_ROOT_PASSWORD" devsync_db' \
  | gzip > "backups/devsync_$(date +%Y%m%d_%H%M%S).sql.gz"
ls -lh backups/
```

**✅ Check:** a non-zero `.sql.gz` appears, and
`gunzip -c backups/<file> | head` shows `CREATE TABLE` statements.

Nightly at 02:00, keeping 30 days:

```bash
crontab -e
# add:
0 2 * * * cd /opt/devsync && mkdir -p backups && docker compose exec -T mysql sh -c 'exec mysqldump --single-transaction --routines -u root -p"$MYSQL_ROOT_PASSWORD" devsync_db' | gzip > "backups/devsync_$(date +\%Y\%m\%d_\%H\%M\%S).sql.gz" && find backups -name '*.sql.gz' -mtime +30 -delete
```

Restore — **test on staging first**:

```bash
gunzip -c backups/devsync_YYYYMMDD_HHMMSS.sql.gz | \
  docker compose exec -T mysql sh -c \
  'mysql -u root -p"$MYSQL_ROOT_PASSWORD" devsync_db'
```

*(`scripts/backup-db.sh` does the same job with retention and logging, for the case
where MySQL is published to the host or moved to a managed database.)*

### Step 13 — Ongoing deploys

**13.1 Manual (after you change code)**

```bash
cd /opt/devsync
git pull
docker compose up -d --build
docker compose ps
```

**13.2 Automated via GitHub Actions** *(optional)*

`cd.yml` already exists: tag `v*` → build & push to GHCR → SSH deploy, gated by a
manual approval. Configure once:

| Kind | Name | Value |
|---|---|---|
| Secret | `DEPLOY_HOST` | Server IP / hostname |
| Secret | `DEPLOY_USER` | `devsync` |
| Secret | `DEPLOY_KEY` | **Private** SSH key; its public half goes in `/home/devsync/.ssh/authorized_keys` |
| Variable | `DEPLOY_URL` | `https://yourdomain.com` |
| Environment | `production` | Settings → Environments → add **required reviewers** |

```bash
git tag v1.0.0 && git push origin v1.0.0
```

Approve the "Deploy to Production" job when it appears. Use
`v1.0.0-rehearsal` to dry-run the identical payload with no production access.

> ⚠️ **Known limitation.** `docker-compose.yml` builds from source and has no
> `image:` keys, so the host's `docker compose pull` fetches nothing from GHCR and
> `server-deploy.sh` never runs `git pull`. Until that's fixed, a tagged deploy
> **rebuilds whatever code is already in `/opt/devsync` and reports success** —
> so always `git pull` on the host first, or fix it per
> [§5.4](#54-cds-pushed-images-are-never-pulled-by-the-host).

---

## 4. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `docker compose up` refuses: `RAZORPAY_KEY_ID is required` | Billing keys are mandatory | Fill all three Razorpay values in `.env` (sandbox is fine) |
| Backend restarts in a loop: `Production startup aborted` | `ProductionConfigValidator` caught a dev fallback (e.g. DB password `12345`), half-configured SMTP, or admin seeding without credentials | The log names the offending variable. Fix `.env`, then `docker compose up -d` |
| Backend: `Could not load trustJKS keystore` | MySQL truststore problem | Re-run `./scripts/generate-db-certs.sh`, then `docker compose up -d --force-recreate backend` |
| Backend: `SSL Connection required, but not provided by server` | `server-key.pem` unreadable to uid 999 | Re-run the cert script (it fixes ownership), then recreate |
| Backend unhealthy while `mysql` is healthy | Backend started before MySQL was ready | `docker compose restart backend` |
| Frontend `502` on `/api/*` | Backend down or unhealthy | `docker compose logs --tail=100 backend` |
| Browser CORS errors | Origin not allowed | `DEVSYNC_CORS_ORIGINS=https://yourdomain.com` exactly — no trailing slash |
| Logged out on every refresh | Cookie marked `Secure` while the browser is on HTTP | Use HTTPS; keep `DEVSYNC_COOKIE_SECURE=true` |
| GitHub/Google button → 404 | `oauth` profile not active | [Step 5a](#step-5--pre-flight-edits-do-not-skip) |
| Build killed (exit 137) | Out of memory | Add swap ([Step 1.5](#step-1--prepare-the-server)) or resize |
| Cert script: `keytool not found` and no Docker | Neither JDK nor usable Docker | `sudo apt install -y openjdk-21-jre-headless` |

Useful commands:

```bash
docker compose ps                              # health of everything
docker compose logs -f --tail=100 backend
docker compose exec backend env | grep -c .    # confirm env reached the container
docker compose down && docker compose up -d    # restart the stack (data survives)
```

> ⚠️ **Never** run `docker compose down -v` in production — `-v` deletes the MySQL
> and uploads volumes. That is data loss, not a restart.

---

## 5. Verified problems to fix before going live

These are real mismatches found by reading the running configuration. The first
two are functional bugs; the rest will bite you during operations.

### 5.1 Social login is dead in the Docker deployment

`application-oauth.yml` (which defines
`spring.security.oauth2.client.registration.*`) only loads when the **`oauth`**
profile is active. `docker-compose.yml` sets:

```yaml
SPRING_PROFILES_ACTIVE: prod     # ← no `oauth`
```

`SecurityConfig` registers the `oauth2Login` filter chain only when a
`ClientRegistrationRepository` exists, and its own comment says that without one
`/oauth2/authorization/*` returns **404**. Since `/auth`'s "Continue with GitHub"
and "Continue with Google" buttons link straight there, **both are broken in the
Docker stack** — and the CI rehearsal can't catch it because it never sets that
profile either.

**Fix:** `SPRING_PROFILES_ACTIVE: prod,oauth` ([Step 5a](#step-5--pre-flight-edits-do-not-skip)),
or move the registrations into `application-prod.yml`.

### 5.2 `docker-compose.yml` does not forward every variable

The backend service uses an explicit `environment:` list, so anything absent from
it is **silently ignored** even if present in `.env`. Verified by diffing the
placeholders in `application*.yml` against the compose file:

| Variable | Effect of the gap |
|---|---|
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | **Google login cannot be configured at all**, even after fixing §5.1 |
| `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL` | Stripe checkout redirects land on the `localhost:5173` defaults |
| `DEVSYNC_ACCOUNT_TOKEN_EXPIRATION_MINUTES` | Reset/verify token lifetime stuck at 15 min |
| `DEVSYNC_REFUND_WINDOW_DAYS` | Stuck at 7 days |
| `DEVSYNC_RATE_LIMIT_INVITE_PER_MINUTE` | Stuck at 10/min |
| `DEVSYNC_BILLING_CURRENCY` | Stuck at INR |
| `MAIL_HEALTH_ENABLED` | SMTP health check cannot be enabled |
| `UPLOAD_MAX_SIZE` | Stuck at 10 MB |
| `LOG_LEVEL_DEV_SYNC`, `LOG_LEVEL_SECURITY` | Cannot raise log level for support |

`UPLOAD_DIR` and `DEVSYNC_TRUST_X_FORWARDED_FOR` are also absent but are
*intentionally* hardcoded — no action needed.

### 5.3 `VITE_SENTRY_DSN` can never be set

`frontend/src/main.tsx` gates `Sentry.init` on `import.meta.env.VITE_SENTRY_DSN`,
but that variable is absent from `frontend/.env.example`, from `frontend/Dockerfile`
(`ARG VITE_API_URL` / `ARG VITE_WS_URL` only) and from compose's frontend
`build.args`. Frontend error reporting is therefore permanently disabled, silently.

**Fix:** add `ARG VITE_SENTRY_DSN` + `ENV`, the matching build arg in compose, and
the line in `.env.example`.

### 5.4 CD's pushed images are never pulled by the host

`docker-compose.yml` gives `backend` and `frontend` a `build:` context with **no
`image:` key**, while `server-deploy.sh` runs `docker compose pull` then
`docker compose up -d`. With no `image:` reference there is nothing to fetch, so
the host **builds from the source in `/opt/devsync`** instead of running the
images CI just produced. Two consequences:

1. `build-and-push` in `cd.yml` is effectively dead work.
2. `server-deploy.sh` never runs `git pull`, so **tagging a release does not
   update the code on the host** — a deploy can rebuild the previous commit and
   report success.

**Fix:** give each service an `image:` matching what CD pushes, e.g.
`image: ghcr.io/<repo-owner>/devsync-backend:latest` (plus `docker login ghcr.io`
on the host), and either add `git pull` to `server-deploy.sh` or drop `build:` from
the deployment compose file.

### 5.5 Razorpay keys are mandatory even if you never take a payment

`docker-compose.yml` declares all three with `:?` and `application-prod.yml`
declares them with **no default**, so a deployment without them cannot start. You
cannot simply skip billing. Dummy values start the app but leave checkout
returning `503`.

### 5.6 The local `.env` is not deployable

It has no OAuth, Google, GitHub-integration, Razorpay or Stripe keys at all, and
its MySQL passwords are 5 characters. Because of §5.5, **`docker compose up` on a
dev machine fails immediately**. Local development doesn't need compose: run MySQL
locally plus `./start-backend.ps1` and `npm run dev`.

### 5.7 A nuance if you add an outer proxy: `X-Forwarded-Proto`

The container's `nginx.conf` re-sets `X-Forwarded-Proto $scheme`, and that
`$scheme` is `http` (TLS terminated further out). So Spring's
`server.forward-headers-strategy: framework` sees `http`. In practice the impact is
contained — `DEVSYNC_COOKIE_SECURE=true` is explicit and the outer proxy adds HSTS
itself — but if you ever depend on `request.isSecure()`, change that line to
propagate the incoming header instead.

---

## 6. Non-negotiable rules

- Never commit `.env`, `certs/`, or any populated `.env.*` other than the
  `[TEMPLATE]` examples.
- Rotate `JWT_SECRET` knowing it invalidates every session — and rotate
  `GITHUB_TOKEN_ENCRYPTION_KEY` only alongside a re-encrypt migration, since
  existing GitHub tokens become unreadable without it.
- Prefer sandbox keys (`rzp_test_*`, `sk_test_*`) everywhere except production.
- Keep `DEVSYNC_ADMIN_SEED_ENABLED=false` outside the one-time bootstrap.
- Keep `DEVSYNC_COOKIE_SECURE=true` and terminate TLS in front of the stack; HSTS
  is enabled by the prod profile and is unsafe over plain HTTP.
- Restrict `DEVSYNC_CORS_ORIGINS` to your real origin — it also governs WebSocket
  handshakes.
- Back up the `mysql_data` volume, not just the container.

---

## 7. Condensed quick reference

```bash
# On the server, as `devsync`
sudo mkdir -p /opt/devsync && sudo chown $USER:$USER /opt/devsync
git clone <REPO_URL> /opt/devsync && cd /opt/devsync

cp .env.example .env && nano .env       # Step 3: secrets + domain + mail + Razorpay
chmod 600 .env
./scripts/generate-db-certs.sh           # Step 4

nano docker-compose.yml                  # Step 5: prod,oauth · GOOGLE_* · 127.0.0.1:8080:8080

docker compose up -d --build             # Step 6
docker compose ps                        # all healthy?
curl -fsS http://127.0.0.1:8080/api/health

sudo apt install -y caddy                # Step 8 adds Caddy's own apt repo first
sudo nano /etc/caddy/Caddyfile           # see Step 8 for the two-line Caddyfile
sudo systemctl reload caddy
curl -I https://yourdomain.com           # 200 + HSTS
```
