# Deployment guide (AWS)

The platform has three parts:

| Part | What it is | Where it runs |
|---|---|---|
| Public portfolio | Static React site (`apps/web`) | GitHub Pages (as today) or S3 + CloudFront |
| API + admin dashboard | NestJS API (`apps/api`) that also serves the admin SPA (`apps/admin`) at `/admin` | One container on AWS (App Runner, ECS Fargate or an EC2 instance) |
| Data | PostgreSQL 16 + an S3 bucket for media | Amazon RDS (or Lightsail/Aurora) + Amazon S3 |

Serving the admin from the API's own origin keeps the refresh-token cookie first-party
(`SameSite=Strict`), so browsers that block third-party cookies can't break admin sign-in.

```
visitor ──► portfolio (GitHub Pages) ──GET /api/public/*, POST /api/analytics/events, /api/public/contact──► API
admin   ──► https://api.<domain>/admin ──same-origin /api/admin/* (Bearer + HttpOnly refresh cookie)──► API
API ──► RDS PostgreSQL        API ──► S3 bucket (uploads)        visitors ──► S3/CloudFront (media URLs)
```

## 1. Create the AWS resources

1. **S3 bucket** (e.g. `parthiban-portfolio-media`, region `ap-south-1`).
   - Keep "Block all public access" ON if you put CloudFront in front (recommended), and give CloudFront
     an Origin Access Control. Otherwise turn off the two *bucket policy* blocks and attach
     `docs/aws/s3-bucket-policy.json` (replace `YOUR_BUCKET`) so only media prefixes are publicly readable.
   - No bucket CORS rules are needed: uploads go through the API, not the browser.
2. **IAM** — a role for the container (App Runner instance role / ECS task role) with
   `docs/aws/iam-api-policy.json`. Prefer the role over access keys; if you must use keys, create a
   dedicated IAM user with only that policy.
3. **RDS PostgreSQL 16** (db.t4g.micro is plenty). Private subnet, security group that only allows
   the API. Create database `portfolio`. Enable automated backups (7+ days).
4. **Container** — build from the repository root with the provided `Dockerfile`
   (`docker build -t portfolio-api .`), push to ECR, run on App Runner or ECS Fargate
   (port 4000, health check `/api/health`). On start it runs `prisma migrate deploy`.
5. **Domain + HTTPS** — e.g. `api.yourdomain.com` → the service (App Runner and ALB provide TLS).

## 2. Environment variables for the API

Store secrets in AWS Secrets Manager / SSM Parameter Store, not in the image.

| Variable | Production value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `postgresql://USER:PASSWORD@<rds-endpoint>:5432/portfolio?schema=public&sslmode=require` |
| `JWT_ACCESS_SECRET` | `openssl rand -base64 48` |
| `ENCRYPTION_KEY` | `openssl rand -base64 32` (encrypts 2FA secrets — **back it up**; losing it disables 2FA logins) |
| `IP_HASH_SALT` | `openssl rand -base64 24` |
| `ADMIN_ORIGIN` | `https://api.yourdomain.com` |
| `PUBLIC_SITE_URL` | `https://theparthi.github.io/Its_me_Parthiban/` |
| `PUBLIC_SITE_ORIGINS` | `https://theparthi.github.io` |
| `COOKIE_SECURE` | `true` |
| `TRUST_PROXY` | `true` (behind App Runner / ALB) |
| `STORAGE_DRIVER` | `s3` |
| `S3_BUCKET`, `S3_REGION` | your bucket and region |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | only if not using an IAM role |
| `MEDIA_PUBLIC_BASE_URL` | `https://<cloudfront-domain>` or `https://<bucket>.s3.<region>.amazonaws.com` |
| `SMTP_*`, `NOTIFY_EMAIL` | optional — Amazon SES SMTP credentials for reset/invite emails |

`ADMIN_DIST_DIR` is already set inside the image.

## 3. First deploy

```bash
# after the container is running and migrations have applied:
npm run seed:prod           # roles + imports the current portfolio content (once; skips if content exists)
npm run admin:create:prod   # interactive; creates the Super Admin (refuses if one exists)
```
Run these inside the container (ECS: `aws ecs execute-command … --interactive --command "sh"`,
then `cd /app/apps/api`). For non-interactive environments set `ADMIN_EMAIL`, `ADMIN_NAME` and
`ADMIN_PASSWORD` for that one command only.

Then open `https://api.yourdomain.com/admin`, sign in, and turn on two-factor authentication
under **Account**.

## 4. Point the portfolio at the API

```bash
# apps/web/.env.production.local (not committed)
VITE_API_URL=https://api.yourdomain.com
npm run deploy:web      # builds and publishes to the gh-pages branch
```

From then on, anything you publish in the admin appears on the portfolio within ~30 seconds, with
no rebuild. Rebuild the portfolio only when its code changes. Without `VITE_API_URL`, the site
renders its bundled static content (what's live today).

## 5. Operations

- **Backups:** RDS automated snapshots cover everything. The dashboard's Settings → Backup exports
  the content as JSON (no users, analytics or messages) for portable copies.
- **Scaling:** the public bundle cache and rate limits are in-memory, so run **one** API instance.
  If you scale out, move them to Redis first.
- **Logs:** failed uploads, publish failures and security events also appear as dashboard
  notifications; everything admins do is in the append-only Activity Log.
- **Rotating secrets:** changing `JWT_ACCESS_SECRET` signs everyone out (harmless).
  Never change `ENCRYPTION_KEY` without first disabling 2FA for all admins.
