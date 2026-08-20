# DevSync Production Deployment Guide

## Prerequisites

- Java 21+ (backend)
- Node.js 18+ (frontend build)
- MySQL 8.0+
- Nginx (reverse proxy)
- Razorpay account (test mode for staging, live for production)

---

## 1. Environment Variables

### Backend (required in production)

```bash
# Database
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/devsync?useSSL=true&requireSSL=true
SPRING_DATASOURCE_USERNAME=devsync_user
SPRING_DATASOURCE_PASSWORD=<strong-password>

# JWT (256-bit minimum, generate with: openssl rand -base64 64)
JWT_SECRET=<generated-secret>

# Razorpay (fail-fast in production)
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=<live-secret>
RAZORPAY_WEBHOOK_SECRET=<webhook-secret>

# Email (optional, both required together)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your@email.com
MAIL_PASSWORD=<app-password>

# Security
DEVSYNC_COOKIE_SECURE=true
DEVSYNC_CORS_ORIGINS=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com

# HSTS (only when HTTPS is guaranteed)
app.security.hsts=true
```

### Frontend

```bash
# Only needed if backend is on a different origin
VITE_API_URL=https://yourdomain.com/api
```

---

## 2. Database Setup

```bash
# Create database and user
mysql -u root -e "
  CREATE DATABASE devsync CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER 'devsync_user'@'%' IDENTIFIED BY '<password>';
  GRANT ALL PRIVILEGES ON devsync.* TO 'devsync_user'@'%';
  FLUSH PRIVILEGES;
"

# Run Flyway migrations (automatic on first boot)
# Or manually: mvn flyway:migrate
```

---

## 3. Build & Deploy

### Backend

```bash
cd backend
./mvnw clean package -DskipTests
java -jar target/devsync-backend.jar --spring.profiles.active=prod
```

### Frontend

```bash
cd frontend
npm ci
npm run build
# Copy dist/ to nginx serve directory
cp -r dist/* /var/www/devsync/
```

---

## 4. Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Serve React SPA
    root /var/www/devsync;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API to backend
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket proxy
    location /ws/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}

# HTTP → HTTPS redirect
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}
```

---

## 5. Razorpay Webhook Configuration

1. Go to Razorpay Dashboard → Settings → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/billing/webhook/razorpay`
3. Select events:
   - `payment.captured`
   - `payment.failed`
   - `payment.refunded`
   - `order.paid`
   - `subscription.cancelled`
   - `subscription.expired`
   - `subscription.activated`
   - `subscription.charged`
4. Copy the webhook secret to `RAZORPAY_WEBHOOK_SECRET`

---

## 6. Backup Strategy

### Schedule (cron)

```bash
# Daily at 2 AM
0 2 * * * DB_PASSWORD=<password> /path/to/scripts/backup-db.sh /path/to/backups
```

### RTO/RPO Targets

| Metric | Target | Notes |
|--------|--------|-------|
| **RPO** (Recovery Point Objective) | 24 hours | Daily backups at 2 AM UTC |
| **RTO** (Recovery Time Objective) | 30 minutes | Restore from latest backup + restart services |

### Backup Details

- **Frequency**: Daily automated via cron
- **Retention**: 30 days (configurable via `RETENTION_DAYS`)
- **Storage**: Local filesystem (consider S3/GCS for production)
- **Format**: Compressed SQL (`*.sql.gz`)
- **Verification**: Run `scripts/restore-test.sh` weekly against staging

### Restore Procedure

```bash
# 1. Stop the application
# 2. Restore backup
gunzip -c backups/devsync_devsync_YYYYMMDD_HHMMSS.sql.gz | mysql -u root -p devsync
# 3. Start the application
# 4. Verify: curl https://yourdomain.com/api/health
```

---

## 7. SSL/TLS Requirements

- **HTTPS**: Mandatory in production (nginx terminates TLS)
- **HSTS**: Enabled via `app.security.hsts=true` in prod profile
- **WebSocket**: Use `wss://` in production (TLS termination at nginx)
- **Forward Headers**: `server.forward-headers-strategy: framework` (already configured in `application-prod.yml`)
- **Cookie Security**: `DEVSYNC_COOKIE_SECURE=true` (HttpOnly + Secure flags)

---

## 8. Security Checklist

- [ ] All secrets via environment variables (no hardcoded credentials)
- [ ] `ddl-auto: validate` in production (never `update`/`create`)
- [ ] CORS restricted to actual domain
- [ ] HSTS enabled (HTTPS guaranteed)
- [ ] Webhook signatures verified (HMAC-SHA256)
- [ ] CSRF protection enabled (CookieCsrfTokenRepository)
- [ ] Rate limiting active on auth endpoints
- [ ] Admin endpoints require `ROLE_ADMIN`
- [ ] Payment state controlled by backend only
- [ ] Email/database credentials not logged
- [ ] `ProductionConfigValidator` blocks dev defaults in prod

---

## 9. Monitoring

- **Health Check**: `GET /api/health`
- **Audit Logs**: `GET /api/admin/audit-logs` (admin only)
- **Error Tracking**: Integrate Sentry or similar
- **Logs**: Structured logging via Logback (`logback-spring.xml`)

---

## 10. Load Testing

```bash
# Basic load test (requires running server)
TEST_EMAIL=alice@test.dev TEST_PASSWORD=Test1234! \
  ./scripts/load-test.sh http://localhost:8080 10 100
```

### Baseline Thresholds (single instance)

| Endpoint | Expected p95 | Notes |
|----------|-------------|-------|
| `POST /api/auth/login` | < 200ms | CPU-bound (BCrypt) |
| `GET /api/public/plans` | < 50ms | Cached/public |
| `GET /api/billing/subscription` | < 100ms | Authenticated, simple query |
| `POST /api/billing/checkout` | < 500ms | Includes Razorpay API call |
| WebSocket connect | < 100ms | After auth |
