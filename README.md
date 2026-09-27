# Parthiban Gunasekaran — Portfolio Platform

Public portfolio + a CMS "Control Center" to manage it, sharing one backend.

| Path | What |
|---|---|
| `apps/web` | Public portfolio (React, Three.js). Reads published content from the API; falls back to the bundled content in `src/data` when no API is configured. Live: https://theparthi.github.io/Its_me_Parthiban/ |
| `apps/admin` | Admin dashboard (React). Served by the API at `/admin` in production. |
| `apps/api` | NestJS REST API: auth, RBAC, content with drafts/versions, media, analytics, contact, audit. Swagger at `/api/docs`. |
| `packages/shared` | Zod schemas and types shared by all three — the single source of truth for validation. |
| `docs/` | `API_CONTRACT.md`, `DEPLOYMENT.md` (AWS), `aws/` policy templates. |

## Local development

Requirements: Node 22+, PostgreSQL 16 (local install; no Docker needed).

```bash
npm install
createdb portfolio_dev && createdb portfolio_test
cp apps/api/.env.example apps/api/.env      # fill in DATABASE_URL and generate the three secrets
npm run build -w @pg/shared
npm run db:migrate                           # apply migrations
npm run db:seed                              # roles + imports the current portfolio content
npm run admin:create                         # create your Super Admin (prompts for a password)

npm run dev:api      # http://localhost:4000   (API, docs at /api/docs)
npm run dev:admin    # http://localhost:5174/admin
npm run dev:web      # http://localhost:5173   (set VITE_API_URL=http://localhost:4000 in apps/web/.env.local to use the API)
```

Media is stored on local disk in development (`STORAGE_DRIVER=local`); switch to S3 with the
environment variables in `apps/api/.env.example`.

## Tests

```bash
npm test     # API end-to-end tests against the portfolio_test database
```

Covers authentication (lockout, refresh rotation and reuse detection, 2FA, password reset),
authorisation for every role, project/profile publishing and visibility in the public API,
versions, backup round-trip, media upload validation and usage checks, analytics collection and
reports, and the contact form.

## Security model (summary)

- No public registration; the first Super Admin is created with `npm run admin:create`.
- Argon2id password hashes; 15-minute access tokens held in memory; rotating refresh tokens in
  `HttpOnly; Secure; SameSite=Strict` cookies, stored only as SHA-256 hashes, with reuse detection.
- Progressive lockout, optional/enforceable TOTP 2FA (secrets AES-GCM encrypted), single-use
  expiring reset and invite tokens, password re-confirmation for sensitive actions.
- Permissions enforced by API guards on every route; the UI only mirrors them.
- Append-only audit log (enforced by a database trigger); secrets are redacted from metadata.
- Analytics: first-party, no IP addresses stored, bots and Do-Not-Track dropped, consent before a
  persistent anonymous ID, configurable retention.

## Deploying

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). The public site deploys with `npm run deploy:web`.
