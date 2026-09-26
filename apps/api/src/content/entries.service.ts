import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import type { Request } from 'express'
import { Collection, SkillInput, collectionSchemas, skillInputSchema } from '@pg/shared'
import { Prisma } from '@prisma/client'
import type { ZodObject, ZodType } from 'zod'
import { AuditService } from '../audit/audit.service'
import type { RequestUser } from '../common/decorators'
import { parse } from '../common/zod'
import { PrismaService } from '../prisma/prisma.service'
import { PublicCacheService } from '../public/public-cache.service'
import { ContentRow, hasUnpublishedChanges, json, pickSent, recordVersion, rowMeta, validateDraft } from './content-utils'

/**
 * Skills and the timeline collections share one draft/published implementation.
 * `kind` doubles as the ContentVersion entityType and the audit resource name.
 */
export const ENTRY_KINDS = {
  skill: { model: 'skill', schema: skillInputSchema },
  experience: { model: 'experience', schema: collectionSchemas.experience },
  education: { model: 'education', schema: collectionSchemas.education },
  certification: { model: 'certification', schema: collectionSchemas.certifications },
  achievement: { model: 'achievement', schema: collectionSchemas.achievements },
} as const
export type EntryKind = keyof typeof ENTRY_KINDS

export const COLLECTION_KIND: Record<Collection, EntryKind> = {
  experience: 'experience',
  education: 'education',
  certifications: 'certification',
  achievements: 'achievement',
}

/** The subset of a Prisma delegate these models have in common. */
interface Delegate {
  findMany(a: object): Promise<ContentRow[]>
  findUnique(a: object): Promise<ContentRow | null>
  create(a: object): Promise<ContentRow>
  update(a: object): Promise<ContentRow>
  updateMany(a: object): Promise<{ count: number }>
  delete(a: object): Promise<ContentRow>
  aggregate(a: object): Promise<{ _max: { order: number | null } }>
}

const delegate = (db: Prisma.TransactionClient, kind: EntryKind) => db[ENTRY_KINDS[kind].model] as unknown as Delegate
const schemaOf = (kind: EntryKind) => ENTRY_KINDS[kind].schema as unknown as ZodType<Record<string, unknown>>

export const entryView = (r: ContentRow) => ({ ...(r.draft as object), ...rowMeta(r) })

@Injectable()
export class EntriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly cache: PublicCacheService,
  ) {}

  private db(kind: EntryKind) {
    return delegate(this.prisma, kind)
  }

  async find(kind: EntryKind, id: string) {
    const r = await this.db(kind).findUnique({ where: { id } })
    if (!r) throw new NotFoundException('Not found')
    return r
  }

  async list(kind: EntryKind, f: { q?: string; status?: string; trash?: boolean }) {
    const rows = await this.db(kind).findMany({
      where: { deletedAt: f.trash ? { not: null } : null, ...(f.status && ['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(f.status) ? { status: f.status } : {}) },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    })
    const q = f.q?.toLowerCase().slice(0, 100)
    const items = rows.filter((r) => !q || JSON.stringify(r.draft).toLowerCase().includes(q)).map(entryView)
    return { items, total: items.length }
  }

  async get(kind: EntryKind, id: string) {
    return entryView(await this.find(kind, id))
  }

  /** Extra denormalised columns (skills carry name and category). */
  private async columns(kind: EntryKind, d: Record<string, unknown>) {
    if (kind !== 'skill') return {}
    const s = d as unknown as SkillInput
    if (!(await this.prisma.skillCategory.findUnique({ where: { id: s.categoryId } }))) throw new BadRequestException('Unknown skill category')
    return { name: s.name, categoryId: s.categoryId }
  }

  async create(u: RequestUser, kind: EntryKind, body: unknown, req: Request) {
    const d = parse(schemaOf(kind), body)
    const max = await this.db(kind).aggregate({ _max: { order: true } })
    const r = await this.db(kind).create({
      data: { ...(await this.columns(kind, d)), draft: json(d), order: (max._max.order ?? -1) + 1, updatedById: u.id },
    })
    await this.audit.record({ action: `${kind}.create`, actor: u, resourceType: kind, resourceId: r.id, req })
    return entryView(r)
  }

  /** Replaces the draft after validation; used by PATCH and version restore. */
  async saveDraft(kind: EntryKind, id: string, draft: unknown, userId: string) {
    const d = parse(schemaOf(kind), draft)
    return this.db(kind).update({
      where: { id },
      data: { ...(await this.columns(kind, d)), draft: json(d), draftUpdatedAt: new Date(), updatedById: userId },
    })
  }

  async update(u: RequestUser, kind: EntryKind, id: string, body: unknown, req: Request) {
    const r = await this.find(kind, id)
    const patch = pickSent(parse((schemaOf(kind) as unknown as ZodObject).partial(), body) as object, body)
    const merged = { ...(r.draft as object), ...patch }
    const updated = await this.saveDraft(kind, id, merged, u.id)
    await this.audit.record({ action: `${kind}.update`, actor: u, resourceType: kind, resourceId: id, metadata: { fields: Object.keys(patch) }, req })
    return entryView(updated)
  }

  async publish(u: RequestUser, kind: EntryKind, id: string, req: Request) {
    const r = await this.find(kind, id)
    if (r.deletedAt) throw new ConflictException('Restore this item from trash before publishing')
    const data = validateDraft(schemaOf(kind), r.draft)
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await delegate(tx, kind).update({ where: { id }, data: { published: json(data), status: 'PUBLISHED', publishedAt: new Date() } })
      await recordVersion(tx, { entityType: kind, entityId: id, action: 'publish', snapshot: data, authorId: u.id })
      return row
    })
    this.cache.invalidate()
    await this.audit.record({ action: `${kind}.publish`, actor: u, resourceType: kind, resourceId: id, req })
    return entryView(updated)
  }

  /** Publishes every live item with pending changes, all or nothing. */
  async publishAll(u: RequestUser, kind: EntryKind, req: Request) {
    const rows = (await this.db(kind).findMany({ where: { deletedAt: null } })).filter(hasUnpublishedChanges)
    const ready = rows.map((r) => ({ id: r.id, data: validateDraft(schemaOf(kind), r.draft) }))
    await this.prisma.$transaction(async (tx) => {
      for (const { id, data } of ready) {
        await delegate(tx, kind).update({ where: { id }, data: { published: json(data), status: 'PUBLISHED', publishedAt: new Date() } })
        await recordVersion(tx, { entityType: kind, entityId: id, action: 'publish', snapshot: data, authorId: u.id })
      }
    })
    this.cache.invalidate()
    await this.audit.record({ action: `${kind}.publish_all`, actor: u, resourceType: kind, metadata: { count: ready.length }, req })
    return { published: ready.length }
  }

  async unpublish(u: RequestUser, kind: EntryKind, id: string, req: Request) {
    const r = await this.find(kind, id)
    const updated = await this.prisma.$transaction(async (tx) => {
      if (r.published) await recordVersion(tx, { entityType: kind, entityId: id, action: 'unpublish', snapshot: r.published, authorId: u.id })
      return delegate(tx, kind).update({ where: { id }, data: { status: 'DRAFT', published: Prisma.DbNull, publishedAt: null } })
    })
    this.cache.invalidate()
    await this.audit.record({ action: `${kind}.unpublish`, actor: u, resourceType: kind, resourceId: id, req })
    return entryView(updated)
  }

  async reorder(u: RequestUser, kind: EntryKind, ids: string[], req: Request) {
    await this.prisma.$transaction(async (tx) => {
      for (const [order, id] of ids.entries()) await delegate(tx, kind).updateMany({ where: { id }, data: { order } })
    })
    this.cache.invalidate()
    await this.audit.record({ action: `${kind}.reorder`, actor: u, resourceType: kind, metadata: { count: ids.length }, req })
    return { ok: true }
  }

  async remove(u: RequestUser, kind: EntryKind, id: string, permanent: boolean, req: Request) {
    await this.find(kind, id)
    if (permanent) {
      await this.prisma.$transaction(async (tx) => {
        await tx.contentVersion.deleteMany({ where: { entityType: kind, entityId: id } })
        await delegate(tx, kind).delete({ where: { id } })
      })
    } else {
      await this.db(kind).update({ where: { id }, data: { deletedAt: new Date() } })
    }
    this.cache.invalidate()
    await this.audit.record({ action: `${kind}.${permanent ? 'delete' : 'trash'}`, actor: u, resourceType: kind, resourceId: id, req })
    return { ok: true }
  }

  async restore(u: RequestUser, kind: EntryKind, id: string, req: Request) {
    await this.find(kind, id)
    const updated = await this.db(kind).update({ where: { id }, data: { deletedAt: null } })
    this.cache.invalidate()
    await this.audit.record({ action: `${kind}.restore`, actor: u, resourceType: kind, resourceId: id, req })
    return entryView(updated)
  }
}
