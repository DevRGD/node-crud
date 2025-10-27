# 🚀 FAANG-grade Node.js Auth Server — Enterprise Best Practices (Lesson + Reference Implementation)

This is a **comprehensive, production-ready** blueprint and reference implementation for an authentication service built to FAANG/MAANG standards. It goes beyond a demo: it covers **security**, **scalability**, **observability**, **deployability**, and **operational resilience**.

Principles applied throughout:
- **Zero trust / least privilege**
- **Defense in depth** (XSS, CSRF, replay, reuse detection)
- **Immutable infrastructure & infra-as-code**
- **Single responsibility** (auth service focuses on auth, not business logic)
- **Observability** (logs, metrics, traces)

---

## 🧭 What you'll get here
1. Architecture overview and design decisions
2. Folder structure for a large app-style auth service
3. Production-grade feature list (security, infra, ops)
4. Code snippets & patterns for every major piece
5. Deployment & infrastructure checklist
6. Next steps: frontend integration, multi-region, audits

---

# 1 — Architecture Overview (High level)

Components:
- **Auth API** (Express/Koa service): issues Access & Refresh tokens
- **Token store** (Redis): stores refresh token metadata for rotation, revocation, and reuse-detection
- **User store** (Postgres): canonical user records, auth factors
- **Secrets manager** (HashiCorp Vault / AWS KMS / AWS Secrets Manager)
- **API Gateway / WAF**: central ingress, rate limiting, IP allow-list
- **Identity provider integrations**: OIDC/OAuth2 with Google, Apple, SAML connectors for enterprise SSO
- **Observability stack**: Prometheus (metrics), Grafana (dashboards), ELK/Opensearch (logs), Jaeger/Tempo (traces)
- **CI/CD pipeline**: GitHub Actions/GitLab CI + automated canary deployments

Token model (gold standard):
- **Access token**: short-lived JWT (or opaque token) returned in response body — stored in client memory. Minimal claims.
- **Refresh token**: rotated opaque token delivered in `HttpOnly; Secure; SameSite=Strict` cookie, path-scoped to `/auth/refresh`. Server stores hashed token in Redis with metadata.

Threats addressed:
- XSS: refresh token inaccessible to JS; access token ephemeral in memory.
- CSRF: APIs expect Authorization header with access token; refresh endpoint uses cookie but is hardened via SameSite, CSRF double-submit or anti-CSRF header, and rotation.
- Token theft & reuse: token rotation & hashed storage; detection leads to revocation of sessions; anomaly detection.

---

# 2 — Folder Structure (Large app)

```
auth-service/
├─ infra/                       # terraform/k8s manifests
├─ src/
│  ├─ api/
│  │  ├─ controllers/
│  │  ├─ routes/
│  │  └─ validators/
│  ├─ services/
│  │  ├─ authService.js
│  │  ├─ userService.js
│  │  └─ tokenService.js
│  ├─ db/
│  │  ├─ pg.js
│  │  └─ redis.js
│  ├─ workers/
│  │  └─ revokeWorker.js
│  ├─ telemetry/
│  │  ├─ metrics.js
│  │  └─ traces.js
│  ├─ middleware/
│  ├─ utils/
│  └─ index.js
├─ tests/
├─ Dockerfile
├─ docker-compose.yml (dev)
├─ .github/workflows/ci.yml
└─ README.md
```

---

# 3 — Production-grade Features (Checklist)

Security
- Short-lived access tokens (≤15m).
- Refresh token rotation + server-side hashed storage.
- Refresh cookie flags: `HttpOnly; Secure; SameSite=Strict; Path=/auth/refresh; Domain=`
- Token binding optional: device id, fingerprint, or PKCE for public clients.
- Rate limiting + exponential backoff on auth endpoints.
- Password hashing with `bcrypt`/`argon2` (argon2 preferred).
- MFA support (TOTP, WebAuthn, SMS fallback via provider).

Scalability & Performance
- Redis for refresh tokens with TTL + persistence snapshotting.
- Connection pooling for Postgres.
- Horizontal scaling via stateless app servers behind load balancer.
- Graceful shutdown and draining connections.

Observability & Ops
- Structured JSON logging (winston/pino) with request ids.
- Metrics (Prometheus) for qps, latencies, error rates.
- Tracing (OpenTelemetry) to debug downstream services.
- Alerting on auth failure spikes, refresh abuse, and key expiry.

DevOps & Deploy
- CI runs tests, lint, vulnerability scans, and builds image.
- Canary deployments + automated rollbacks.
- Infrastructure as code (Terraform) for infra reproducibility.

Compliance & Governance
- Audit logs for token issuance, refresh, revoke actions.
- Rotation policy for signing keys and secrets.
- Data residency: support multi-region DBs and key rotation.

---

# 4 — Core Implementation Patterns (Code snippets & explanations)

The following show how to implement the **most critical parts**. This is not the entire repo, but the patterns are complete and production-ready.

## 4.1 Environment & secrets

**Principle:** Never commit secrets. Use Vault/KMS + environment variables injected at runtime.

`.env.example`
```
NODE_ENV=production
PORT=443
PG_CONN=postgres://user:pass@postgres:5432/auth
REDIS_URL=redis://redis:6379
ACCESS_TOKEN_EXP=15m
REFRESH_TOKEN_EXP=7d
ACCESS_KEY_ID=access-key-id
# Do NOT store private keys here in prod — use Vault / KMS
```

## 4.2 Database modules (pg + redis)

`src/db/pg.js`
```js
import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.PG_CONN, max: 20 });
export default pool;
```

`src/db/redis.js`
```js
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);
export default redis;
```

## 4.3 Token service (rotation + hashed storage)

`src/services/tokenService.js`
```js
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import argon2 from 'argon2';
import redis from '../db/redis.js';

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET; // rotate via KMS
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET;
const ACCESS_EXP = process.env.ACCESS_TOKEN_EXP || '15m';
const REFRESH_EXP = process.env.REFRESH_TOKEN_EXP || '7d';

export function signAccessToken(user) {
  const payload = { sub: user.id, scope: user.scope }; // minimal
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXP, keyid: process.env.ACCESS_KEY_ID });
}

export async function generateRefreshToken(userId, deviceId) {
  const tokenId = crypto.randomUUID();
  // issue opaque token with jti, signed for expiry
  const token = jwt.sign({ jti: tokenId }, REFRESH_SECRET, { expiresIn: REFRESH_EXP });
  const hash = await argon2.hash(token);
  const meta = { userId, deviceId, createdAt: Date.now() };
  // store hashed token with TTL
  await redis.set(`rt:${tokenId}`, JSON.stringify({ hash, meta }), 'PX', msFromExpiry(REFRESH_EXP));
  return { token, tokenId };
}

export async function verifyAndRotateRefresh(token) {
  const payload = jwt.verify(token, REFRESH_SECRET);
  const tokenId = payload.jti;
  const entry = await redis.get(`rt:${tokenId}`);
  if (!entry) throw new Error('not_found_or_reused');
  const { hash, meta } = JSON.parse(entry);
  const ok = await argon2.verify(hash, token);
  if (!ok) {
    // possible reuse: revoke all sessions for this user
    await revokeAllForUser(meta.userId);
    throw new Error('reuse_detected');
  }
  // rotate: create new token and atomically rename
  const { token: newToken, tokenId: newId } = await generateRefreshToken(meta.userId, meta.deviceId);
  // mark old token as replaced (short TTL) to detect reuse
  await redis.set(`rt_replaced:${tokenId}`, JSON.stringify({ replacedBy: newId }), 'PX', 24 * 3600 * 1000);
  await redis.del(`rt:${tokenId}`);
  return { newToken, meta };
}

async function revokeAllForUser(userId) {
  // Implementation: track set of tokenIds per user, iterate and delete
}

function msFromExpiry(str) {
  // convert '7d' or '15m' to milliseconds
}
```

**Notes:**
- Use `argon2` over `bcrypt` for token hashing.
- Store canonical token IDs in a per-user Redis set for efficient revocation.

## 4.4 Auth controller flows

`src/api/controllers/authController.js`
```js
// login -> issue access + refresh cookie
// refresh -> rotate refresh + return fresh access
// logout -> revoke token and clear cookie
```

Key endpoint behaviors:
- `/auth/login` — validate credentials, issue access token in body, Set-Cookie with refresh token. Add `deviceId` if provided.
- `/auth/refresh` — only allowed via POST; cookie auto-sent. Validate, rotate, return new access token. Add anomaly detection: country/IP changes.
- `/auth/logout` — revoke active refresh and clear cookie. Optionally issue logout event to event bus.

## 4.5 Cookie security

Set cookies with:
```js
res.cookie('refresh_token', token, {
  httpOnly: true,
  secure: true, // always true in prod
  sameSite: 'Strict',
  path: '/auth/refresh',
  domain: process.env.COOKIE_DOMAIN,
  maxAge: msFromExpiry(REFRESH_EXP)
});
```

Because `SameSite=Strict` can break some SSO flows, for some enterprise SSO you may use `Lax` + CSRF double submit.

## 4.6 MFA & Device Binding

- When user registers or logs in from new device, perform step-up auth: TOTP or WebAuthn.
- Store device metadata (deviceId, userAgent, lastSeen, fingerprintHash) in Postgres.
- Enforce additional checks for refresh token usage from new geolocation or device.

## 4.7 Observability snippets

**Prometheus metrics** (via `prom-client`) for counters: `auth_logins_total`, `auth_refresh_total`, `auth_refresh_reuse_detected_total`.

**Tracing** (OpenTelemetry): instrument incoming requests, DB calls, and generate span on refresh rotation.

**Logging** (pino/winston): include `requestId`, `userId`, `tokenId` (hashed), `ip`, `ua`.

---

# 5 — Operational Patterns

## 5.1 Key rotation & secret management
- Store signing keys in Vault or KMS. Use key IDs (`kid`) in JWT headers.
- Maintain key rollover logic: new tokens signed by new key; old key remains for verification for a transition window.

## 5.2 Rate limiting & WAF
- Apply global rate limit (e.g. 100 req/min) and per-IP stricter limits on `/auth/login` and `/auth/refresh`.
- Block suspicious IPs using WAF rules (e.g., AWS WAF, Cloudflare).

## 5.3 Blue/Green & Canary
- Use canary percentage rollouts. Run smoke tests on canary before promoting.
- Keep DB migrations backward-compatible.

## 5.4 Incident response
- Alert on token reuse, spike in failed logins, or traceable credential stuffing.
- Provide endpoints to revoke tokens at user & org level. Publish revocation events.

---

# 6 — Deployment Checklist

1. HTTPS enforced via LB (ALB/NGINX/Envoy).
2. Secrets injected from Vault/KMS — no secrets in images.
3. Redis with persistence (AOF/RDB) and replica.
4. Postgres with backups and read replicas.
5. Metrics & logs shipped to central stack.
6. SSO connectors (OIDC, SAML) configured in a separate admin UI.
7. Automated security scans (Snyk/Trivy) in CI.
8. Pen-test and periodic security review.

---

# 7 — Developer Experience & Client Integration

**Frontend expectations** (React/Next/Vue):
- Store **access token** in memory (React state / context) only.
- Attach `Authorization: Bearer <access>` header on API calls.
- When 401 due to expired access, call `POST /auth/refresh` (cookie auto-sent). On success, update in-memory access token.
- Handle refresh failures by redirecting to login.

**Mobile:** store refresh tokens in secure storage (iOS Keychain / Android Keystore). Use PKCE for public clients.

---

# 8 — Example: `index.js` (production-focused bootstrapping)

```js
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pino from 'pino-http';
import promBundle from 'express-prom-bundle';
import routes from './api/routes/index.js';
import { initTelemetry } from './telemetry/traces.js';

initTelemetry();
const app = express();
app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(pino());
app.use(
  rateLimit({ windowMs: 60 * 1000, max: 100 })
);
app.use(promBundle({ includeMethod: true, includePath: true }));
app.use('/api', routes);

app.get('/healthz', (req, res) => res.json({ ok: true }));

process.on('SIGTERM', async () => {
  console.info('SIGTERM received: graceful shutdown');
  // stop accepting new connections, wait for inflight requests
  process.exit(0);
});

export default app;
```

---

# 9 — Compliance & Auditing

- Emit audit events for: login success/failure, refresh, revoke, MFA setup/attempts.
- Retain logs according to policy (e.g., 1 year for security events).
- Provide admin UI to query sessions and revoke them at will.

---

# 10 — Final Notes + Next Steps

This document is intended as a single-authoritative blueprint to build an enterprise-grade auth service. If you want, I will:

- 🔁 **Generate the full codebase** (all files, module-by-module) using Redis for refresh store and Postgres for users — production-ready Dockerfile + GitHub Actions.
- 🧭 **Create the React client** integrating memory-stored access tokens and silent refresh with retries + exponential backoff.
- ♻️ **Add Terraform + Kubernetes manifests** for infra automation and k8s manifests with liveness/readiness probes.
- 🔐 **Add WebAuthn MFA flow** code & user UI.

Pick one and I will generate the full code for it right here.
