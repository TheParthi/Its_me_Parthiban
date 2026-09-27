import { ConflictException, ForbiddenException, UnprocessableEntityException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { Permission } from '@pg/shared'
import sanitizeHtml from 'sanitize-html'
import type { ZodType } from 'zod'
import type { RequestUser } from '../common/decorators'

export const json = (v: unknown) => v as Prisma.InputJsonValue
export const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null)

/**
 * Markdown fields must never carry raw HTML. Strips every tag, then restores the
 * few entities markdown needs as literal characters (blockquotes, ampersands).
 * `<` stays encoded, so no tag can be reintroduced.
 */
export function stripHtml(md: string) {
  return sanitizeHtml(md, { allowedTags: [], allowedAttributes: {} })
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

/** Re-validates a stored draft before publishing; invalid drafts are refused with 422. */
export function validateDraft<T>(schema: ZodType<T>, draft: unknown): T {
  const r = schema.safeParse(draft)
  if (!r.success) {
    throw new UnprocessableEntityException({
      message: 'The draft is not valid and cannot be published',
      issues: r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    })
  }
  return r.data
}

/** Runtime check for routes whose permission depends on a parameter. */
export function assertPerms(u: RequestUser, ...perms: Permission[]) {
  if (perms.some((p) => !u.permissions.includes(p))) throw new ForbiddenException('You do not have permission to do this')
}

export const isUniqueViolation = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002'

export async function uniqueOr409<T>(fn: () => Promise<T>, message: string): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    if (isUniqueViolation(e)) throw new ConflictException(message)
    throw e
  }
}

/** Appends a ContentVersion with the next version number (call inside the publishing transaction). */
export async function recordVersion(
  tx: Prisma.TransactionClient,
  v: { entityType: string; entityId: string; action: string; snapshot: unknown; authorId?: string | null },
) {
  const max = await tx.contentVersion.aggregate({ where: { entityType: v.entityType, entityId: v.entityId }, _max: { version: true } })
  return tx.contentVersion.create({
    data: {
      entityType: v.entityType,
      entityId: v.entityId,
      version: (max._max.version ?? 0) + 1,
      action: v.action,
      snapshot: json(v.snapshot),
      authorId: v.authorId ?? null,
    },
  })
}

/** Common shape for rows that follow the draft/published pattern. */
export interface ContentRow {
  id: string
  order: number
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  draft: Prisma.JsonValue
  published: Prisma.JsonValue | null
  publishedAt: Date | null
  draftUpdatedAt: Date
  deletedAt: Date | null
  updatedAt: Date
}

/** Compares content, not timestamps, so reverted edits don't count as pending. */
export const hasUnpublishedChanges = (r: Pick<ContentRow, 'draft' | 'published' | 'publishedAt'>) =>
  r.published == null || !r.publishedAt || JSON.stringify(r.draft) !== JSON.stringify(r.published)

export function rowMeta(r: ContentRow) {
  return {
    id: r.id,
    order: r.order,
    status: r.status,
    hasUnpublishedChanges: hasUnpublishedChanges(r),
    publishedAt: iso(r.publishedAt),
    updatedAt: r.updatedAt.toISOString(),
    deletedAt: iso(r.deletedAt),
  }
}

/**
 * Validates a partial update and keeps only the keys the client sent — zod 4
 * applies field defaults even inside `.partial()`, which would otherwise reset
 * untouched fields.
 */
export function pickSent<T extends object>(parsed: T, body: unknown): Partial<T> {
  const sent = new Set(Object.keys(body && typeof body === 'object' ? body : {}))
  return Object.fromEntries(Object.entries(parsed).filter(([k, v]) => sent.has(k) && v !== undefined)) as Partial<T>
}
