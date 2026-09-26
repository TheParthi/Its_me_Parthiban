import { z } from 'zod'

const bool = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1')

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.string().min(1),

  /** HMAC secret for short-lived access tokens. */
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  /** 32-byte key (base64) for encrypting TOTP secrets at rest. */
  ENCRYPTION_KEY: z
    .string()
    .refine((k) => Buffer.from(k, 'base64').length === 32, 'ENCRYPTION_KEY must be 32 bytes, base64-encoded'),
  /** Salt for hashing IPs in rate-limit keys; never stored with analytics. */
  IP_HASH_SALT: z.string().min(16),

  /** Origin the admin dashboard is served from (same origin as the API in production). */
  ADMIN_ORIGIN: z.string().url(),
  /** Comma-separated origins allowed to call the public API (the portfolio). */
  PUBLIC_SITE_ORIGINS: z.string().default(''),
  /** Public URL of the portfolio, used in emails, sitemap and previews. */
  PUBLIC_SITE_URL: z.string().url(),
  COOKIE_SECURE: bool.default(true),
  TRUST_PROXY: bool.default(false),

  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  LOCAL_UPLOAD_DIR: z.string().default('./uploads'),
  /** Base URL media is served from. For local storage: <api>/media. */
  MEDIA_PUBLIC_BASE_URL: z.string().url(),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: bool.default(false),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  NOTIFY_EMAIL: z.string().email().optional(),

  /** Path to the built admin SPA to serve at /admin (production). */
  ADMIN_DIST_DIR: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

let cached: Env | null = null

export function env(): Env {
  if (cached) return cached
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Invalid environment configuration:\n${issues}`)
  }
  if (parsed.data.STORAGE_DRIVER === 's3') {
    for (const k of ['S3_BUCKET', 'S3_REGION', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const) {
      if (!parsed.data[k]) throw new Error(`STORAGE_DRIVER=s3 requires ${k}`)
    }
  }
  cached = parsed.data
  return cached
}

export function publicOrigins(): string[] {
  return env()
    .PUBLIC_SITE_ORIGINS.split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}
