import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import type { Request } from 'express'
import { DEFAULT_APPEARANCE, Profile, appearanceSchema, homepageSchema, profileSchema, seoSchema } from '@pg/shared'
import type { SiteDocument } from '@prisma/client'
import type { ZodType } from 'zod'
import { AuditService } from '../audit/audit.service'
import type { RequestUser } from '../common/decorators'
import { parse } from '../common/zod'
import { PrismaService } from '../prisma/prisma.service'
import { PublicCacheService } from '../public/public-cache.service'
import { iso, json, recordVersion, stripHtml, validateDraft } from './content-utils'

export const DOCS = {
  profile: { key: 'PROFILE', schema: profileSchema as ZodType<unknown> },
  homepage: { key: 'HOMEPAGE', schema: homepageSchema as ZodType<unknown> },
  appearance: { key: 'APPEARANCE', schema: appearanceSchema as ZodType<unknown> },
  seo: { key: 'SEO', schema: seoSchema as ZodType<unknown> },
} as const
export type DocKey = keyof typeof DOCS

export function docKey(key: string): DocKey {
  if (!(key in DOCS)) throw new NotFoundException('Unknown document')
  return key as DocKey
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly cache: PublicCacheService,
  ) {}

  private find(key: DocKey) {
    return this.prisma.siteDocument.findUnique({ where: { key: DOCS[key].key } })
  }

  private view(key: DocKey, d: SiteDocument | null) {
    return {
      key,
      draft: d?.draft ?? (key === 'appearance' ? DEFAULT_APPEARANCE : null),
      published: d?.published ?? null,
      status: d?.status ?? 'DRAFT',
      publishedAt: iso(d?.publishedAt),
      updatedAt: iso(d?.updatedAt),
      // jsonb normalises key order, so a string comparison is a reliable deep-equal.
      hasUnpublishedChanges: !d?.published || JSON.stringify(d.draft) !== JSON.stringify(d.published),
    }
  }

  async get(key: DocKey) {
    return this.view(key, await this.find(key))
  }

  /** Validates and stores a draft; shared by PUT, appearance reset and version restore. */
  async saveDraft(key: DocKey, body: unknown, userId: string) {
    let data = parse(DOCS[key].schema, body)
    if (key === 'profile') data = { ...(data as Profile), longBio: stripHtml((data as Profile).longBio) }
    const k = DOCS[key].key
    const d = await this.prisma.siteDocument.upsert({
      where: { key: k },
      create: { key: k, draft: json(data), updatedById: userId },
      update: { draft: json(data), updatedById: userId },
    })
    return this.view(key, d)
  }

  async update(u: RequestUser, key: DocKey, body: unknown, req: Request) {
    const v = await this.saveDraft(key, body, u.id)
    await this.audit.record({ action: `${key}.update`, actor: u, resourceType: key, resourceId: DOCS[key].key, req })
    return v
  }

  async publish(u: RequestUser, key: DocKey, req: Request) {
    const d = await this.find(key)
    if (!d) throw new NotFoundException('There is no draft to publish')
    const data = validateDraft(DOCS[key].schema, d.draft)
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.siteDocument.update({
        where: { key: d.key },
        data: { published: json(data), status: 'PUBLISHED', publishedAt: new Date(), updatedById: u.id },
      })
      await recordVersion(tx, { entityType: key, entityId: d.key, action: 'publish', snapshot: data, authorId: u.id })
      return row
    })
    this.cache.invalidate()
    await this.audit.record({ action: `${key}.publish`, actor: u, resourceType: key, resourceId: d.key, req })
    return this.view(key, updated)
  }

  async discard(u: RequestUser, key: DocKey, req: Request) {
    const d = await this.find(key)
    if (!d?.published) throw new ConflictException('Nothing has been published yet')
    const updated = await this.prisma.siteDocument.update({ where: { key: d.key }, data: { draft: json(d.published), updatedById: u.id } })
    await this.audit.record({ action: `${key}.discard`, actor: u, resourceType: key, resourceId: d.key, req })
    return this.view(key, updated)
  }

  async resetAppearance(u: RequestUser, req: Request) {
    const v = await this.saveDraft('appearance', DEFAULT_APPEARANCE, u.id)
    await this.audit.record({ action: 'appearance.reset', actor: u, resourceType: 'appearance', resourceId: 'APPEARANCE', req })
    return v
  }
}
