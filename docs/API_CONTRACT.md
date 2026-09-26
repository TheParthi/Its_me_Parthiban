# API contract

All routes are under `/api`. Admin routes need `Authorization: Bearer <accessToken>` and the listed
permission (enforced by `@RequirePermissions` + global guards). Request bodies are validated with the
zod schemas in `@pg/shared` via `ZodPipe`; validation errors return
`400 { message: 'Validation failed', issues: [{ path, message }] }`.

Conventions
- JSON everywhere; ids are strings (BigInt ids serialised as strings).
- Lists: `GET` returns `{ items, total }` unless noted. Admin lists support `?q=&status=&page=&pageSize=`.
- Mutations write an audit entry (`AuditService.record`) with action `<resource>.<verb>`.
- Content entities use draft/published: edits change `draft`; `publish` copies draft → `published`,
  sets `status=PUBLISHED`, `publishedAt`, writes a `ContentVersion`, and invalidates the public cache
  (`PublicCacheService.invalidate()`).
- `hasUnpublishedChanges = published == null || draftUpdatedAt > publishedAt`.
- Soft delete via `deletedAt` (trash); `DELETE ?permanent=true` removes for good (needs `content:delete`).

## Auth — done (`src/auth`)
`POST /auth/login` · `POST /auth/2fa/verify` · `POST /auth/refresh` (cookie + `X-Requested-With: pg-admin`) ·
`POST /auth/logout` (same header) · `POST /auth/forgot-password` · `POST /auth/reset-password` ·
`POST /auth/accept-invite` · `GET /auth/me` · `POST /auth/reauth` · `POST /auth/change-password` ·
`POST /auth/2fa/setup|enable|disable`.
A 403 with `code: 'REAUTH_REQUIRED'` means: call `/auth/reauth` with the password, then retry.

## Users, security, audit, settings, notifications — done
`GET /admin/users` · `GET /admin/users/roles` · `POST /admin/users` (invite → `{ id, emailSent, inviteLink }`) ·
`PATCH /admin/users/:id` · `DELETE /admin/users/:id` · `POST /admin/users/:id/revoke-sessions` ·
`GET /admin/users/:id/activity` · `GET /admin/security/overview` · `POST /admin/security/sessions/:id/revoke` ·
`GET /admin/audit?q=&action=&actorId=&success=&from=&to=&cursor=&limit=` → `{ items, nextCursor }` ·
`GET|PUT /admin/settings` (`siteSettingsSchema`) · `GET /admin/settings/system` ·
`GET /admin/notifications` → `{ items, unread }` · `POST /admin/notifications/:id/read` · `POST /admin/notifications/read-all` ·
`GET /health`.

## Content (`src/content`)

Singleton documents — keys `profile`, `homepage`, `appearance`, `seo`:

| Method | Path | Permission | Body / result |
|---|---|---|---|
| GET | `/admin/documents/:key` | content:read | `{ key, draft, published, status, publishedAt, updatedAt, hasUnpublishedChanges }` |
| PUT | `/admin/documents/:key` | content:write (profile) / site:write (others) | full draft, validated by the key's schema |
| POST | `/admin/documents/:key/publish` | content:publish (+ site:write for non-profile) | publishes the draft |
| POST | `/admin/documents/:key/discard` | content:write | resets draft to published |
| POST | `/admin/documents/appearance/reset` | site:write | draft ← `DEFAULT_APPEARANCE` |

Projects:

| Method | Path | Permission |
|---|---|---|
| GET | `/admin/projects?q=&status=&trash=true` | content:read → `ProjectAdmin[]` ordered by `order` |
| GET | `/admin/projects/:id` | content:read |
| POST | `/admin/projects` | content:write (`projectInputSchema`) → created as DRAFT |
| PATCH | `/admin/projects/:id` | content:write (`projectUpdateSchema`) |
| POST | `/admin/projects/:id/duplicate` | content:write (slug gets `-copy` suffix, DRAFT) |
| POST | `/admin/projects/:id/publish` | content:publish (optional body `{ at: ISO }` schedules) |
| POST | `/admin/projects/:id/unpublish` | content:publish (→ DRAFT, published=null) |
| POST | `/admin/projects/:id/archive` | content:publish (→ ARCHIVED, hidden publicly) |
| POST | `/admin/projects/reorder` | content:write `{ ids: string[] }` |
| DELETE | `/admin/projects/:id` | content:delete (trash; `?permanent=true` purge) |
| POST | `/admin/projects/:id/restore` | content:delete (from trash) |

Skills: `GET|POST /admin/skill-categories`, `PATCH|DELETE /admin/skill-categories/:id`,
`POST /admin/skill-categories/reorder`; `GET|POST /admin/skills`, `PATCH|DELETE /admin/skills/:id`,
`POST /admin/skills/:id/publish|unpublish`, `POST /admin/skills/reorder`, `POST /admin/skills/publish-all`.

Collections — `:collection` ∈ `experience | education | certifications | achievements`:
`GET|POST /admin/:collection`, `GET|PATCH|DELETE /admin/:collection/:id`,
`POST /admin/:collection/:id/publish|unpublish`, `POST /admin/:collection/reorder`.

Versions: `GET /admin/versions/:entityType/:entityId` → `[{ id, version, action, author, createdAt }]`;
`GET /admin/versions/item/:versionId` → snapshot; `POST /admin/versions/item/:versionId/restore`
(content:publish; copies snapshot into the draft — the admin publishes afterwards).

Preview: `POST /admin/preview-token` → `{ token, url }` (15-minute token, type PREVIEW). The portfolio
opens `?preview=<token>` and calls `GET /public/preview?token=` which returns a `PublicBundle` built from
**drafts**. Invalid/expired → 401.

Scheduler: every minute, projects with `publishAt <= now` are published (audit actor = system).

## Public (`src/public`) — unauthenticated, published data only
`GET /public/bundle` → `PublicBundle` (cached in memory, `Cache-Control: public, max-age=30`, ETag) ·
`GET /public/profile` · `GET /public/projects` · `GET /public/projects/:slug` · `GET /public/skills` ·
`GET /public/experience` · `GET /public/education` · `GET /public/homepage` · `GET /public/settings`
(appearance + seo + analytics consent flags) · `GET /public/sitemap.xml` · `GET /public/robots.txt` ·
`GET /public/preview?token=`. Trashed, draft, archived and `UNLISTED` (except by slug) projects never appear.

## Media (`src/media`)
`POST /admin/media` (multipart `file`, fields `category`, `alt`) → `MediaAsset` · `GET /admin/media?q=&category=&type=image|document&from=&to=&page=` ·
`PATCH /admin/media/:id` (`{ alt?, fileName?, category? }`) · `POST /admin/media/:id/replace` (multipart) ·
`GET /admin/media/:id/usage` → `[{ type, id, title, published }]` · `DELETE /admin/media/:id` (409 when referenced).
Storage driver `local | s3` from env. Images re-encoded with sharp (EXIF stripped), max 10 MB, JPEG/PNG/WebP/AVIF/GIF;
documents: PDF only, max 10 MB. Magic-byte sniffing, not the client MIME type.

## Analytics (`src/analytics`)
`POST /analytics/events` (public, `analyticsBatchSchema`, JSON or `text/plain` beacon, rate limited, bots dropped,
DNT/GPC respected when configured) → 204 ·
`GET /admin/analytics/overview?preset=&from=&to=&path=&source=&campaign=` (analytics:read) → `AnalyticsOverview` ·
`GET /admin/analytics/projects` (analytics:read) → per-project `{ slug, title, views, uniqueSessions, avgEngagementSec, demoClicks, githubClicks, ctr, sources }` ·
`GET /admin/analytics/sources` · `GET /admin/analytics/journeys` (top paths, aggregated) ·
`GET /admin/analytics/sessions?page=` (analytics:sessions) · `GET /admin/analytics/sessions/:id` ·
`GET /admin/analytics/live` (analytics:sessions) → sessions active in the configured window.

## Contact (`src/contact`)
`POST /public/contact` (`contactSubmitSchema`; honeypot, min elapsed time, rate limit) → 201 `{ ok: true }` ·
`GET /admin/messages?q=&status=&page=` · `GET /admin/messages/:id` (marks READ) · `PATCH /admin/messages/:id` `{ status }` ·
`DELETE /admin/messages/:id` · `POST /admin/messages/export` `{ ids }` → CSV.

## Search, backup
`GET /admin/search?q=` → grouped `{ projects, skills, experience, messages, media, users }`, each group only if
the caller holds its permission. · `GET /admin/backup/export` (backup:export) → JSON of all content (no users,
sessions, analytics or messages) · `POST /admin/backup/restore` (backup:restore + recent auth, body = export JSON,
`?confirm=RESTORE`) → transactional replace of content, each restored item left as the published state.
