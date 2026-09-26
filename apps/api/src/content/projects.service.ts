import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import type { Request } from 'express'
import { ContentStatus, ProjectAdmin, ProjectInput, projectInputSchema, projectUpdateSchema } from '@pg/shared'
import { Prisma, Project } from '@prisma/client'
import { z } from 'zod'
import { AuditService } from '../audit/audit.service'
import type { RequestUser } from '../common/decorators'
import { parse } from '../common/zod'
import { PrismaService } from '../prisma/prisma.service'
import { PublicCacheService } from '../public/public-cache.service'
import { hasUnpublishedChanges, iso, json, pickSent, recordVersion, stripHtml, uniqueOr409, validateDraft } from './content-utils'

type Actor = Pick<RequestUser, 'id' | 'email'> | null
const SLUG_TAKEN = 'Another project already uses this slug'

function clean(d: ProjectInput): ProjectInput {
  return { ...d, description: stripHtml(d.description), contribution: stripHtml(d.contribution) }
}

/** Denormalised columns kept in sync with the draft. */
const columns = (d: ProjectInput) => ({ title: d.title, slug: d.slug, featured: d.featured, draft: json(d) })
const techs = (d: ProjectInput) => [...new Set(d.technologies)].map((name, order) => ({ name, order }))

export function toAdmin(p: Project): ProjectAdmin {
  return {
    ...(p.draft as unknown as ProjectInput),
    id: p.id,
    order: p.order,
    status: p.status as ContentStatus,
    hasUnpublishedChanges: hasUnpublishedChanges(p),
    publishedAt: iso(p.publishedAt),
    publishAt: iso(p.publishAt),
    updatedAt: p.updatedAt.toISOString(),
    deletedAt: iso(p.deletedAt),
  }
}

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly cache: PublicCacheService,
  ) {}

  private async find(id: string) {
    const p = await this.prisma.project.findUnique({ where: { id } })
    if (!p) throw new NotFoundException('Project not found')
    return p
  }

  async list(f: { q?: string; status?: string; trash?: boolean }) {
    const status = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).safeParse(f.status)
    const rows = await this.prisma.project.findMany({
      where: {
        deletedAt: f.trash ? { not: null } : null,
        ...(status.success ? { status: status.data } : {}),
        ...(f.q ? { OR: [{ title: { contains: f.q, mode: 'insensitive' } }, { slug: { contains: f.q, mode: 'insensitive' } }] } : {}),
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    })
    return rows.map(toAdmin)
  }

  async get(id: string) {
    return toAdmin(await this.find(id))
  }

  private async nextOrder() {
    const m = await this.prisma.project.aggregate({ _max: { order: true } })
    return (m._max.order ?? -1) + 1
  }

  async create(u: RequestUser, input: ProjectInput, req: Request) {
    const d = clean(input)
    const order = await this.nextOrder()
    const p = await uniqueOr409(
      () => this.prisma.project.create({ data: { ...columns(d), order, updatedById: u.id, technologies: { create: techs(d) } } }),
      SLUG_TAKEN,
    )
    await this.audit.record({ action: 'project.create', actor: u, resourceType: 'project', resourceId: p.id, metadata: { slug: d.slug }, req })
    return toAdmin(p)
  }

  /** Replaces the draft (validated) and re-syncs technologies. Used by PATCH and version restore. */
  async saveDraft(id: string, draft: unknown, userId: string) {
    const d = clean(parse(projectInputSchema, draft))
    return uniqueOr409(
      () =>
        this.prisma.$transaction(async (tx) => {
          await tx.projectTechnology.deleteMany({ where: { projectId: id } })
          return tx.project.update({
            where: { id },
            data: { ...columns(d), draftUpdatedAt: new Date(), updatedById: userId, technologies: { create: techs(d) } },
          })
        }),
      SLUG_TAKEN,
    )
  }

  async update(u: RequestUser, id: string, body: unknown, req: Request) {
    const p = await this.find(id)
    const patch = pickSent(parse(projectUpdateSchema, body), body)
    const merged = { ...(p.draft as object), ...patch }
    const updated = await this.saveDraft(id, merged, u.id)
    await this.audit.record({ action: 'project.update', actor: u, resourceType: 'project', resourceId: id, metadata: { fields: Object.keys(patch) }, req })
    return toAdmin(updated)
  }

  async duplicate(u: RequestUser, id: string, req: Request) {
    const src = await this.find(id)
    const d = src.draft as unknown as ProjectInput
    const base = d.slug.slice(0, 70)
    let slug = `${base}-copy`
    for (let i = 2; await this.prisma.project.findUnique({ where: { slug }, select: { id: true } }); i++) slug = `${base}-copy-${i}`
    const copy: ProjectInput = { ...d, slug, title: `${d.title} (copy)`.slice(0, 80), featured: false }
    const p = await this.prisma.project.create({
      data: { ...columns(copy), order: await this.nextOrder(), updatedById: u.id, technologies: { create: techs(copy) } },
    })
    await this.audit.record({ action: 'project.duplicate', actor: u, resourceType: 'project', resourceId: p.id, metadata: { from: id }, req })
    return toAdmin(p)
  }

  /** Publishes now, or schedules when `at` is in the future. */
  async publish(u: RequestUser, id: string, at: string | undefined, req: Request) {
    const p = await this.find(id)
    if (p.deletedAt) throw new ConflictException('Restore the project from trash before publishing')
    const when = at ? new Date(at) : null
    if (when && when.getTime() > Date.now()) {
      validateDraft(projectInputSchema, p.draft) // refuse to schedule something that cannot publish
      const updated = await this.prisma.project.update({ where: { id }, data: { publishAt: when } })
      await this.audit.record({ action: 'project.schedule', actor: u, resourceType: 'project', resourceId: id, metadata: { at: when.toISOString() }, req })
      return toAdmin(updated)
    }
    const updated = await this.publishNow(id, u)
    await this.audit.record({ action: 'project.publish', actor: u, resourceType: 'project', resourceId: id, req })
    return toAdmin(updated)
  }

  /** Transactional publish; also used by the scheduler (actor null). */
  async publishNow(id: string, actor: Actor) {
    const p = await this.find(id)
    const data = validateDraft(projectInputSchema, p.draft)
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.project.update({
        where: { id },
        data: { published: json(data), status: 'PUBLISHED', publishedAt: new Date(), publishAt: null },
      })
      await recordVersion(tx, { entityType: 'project', entityId: id, action: 'publish', snapshot: data, authorId: actor?.id })
      return row
    })
    this.cache.invalidate()
    return updated
  }

  async unpublish(u: RequestUser, id: string, req: Request) {
    const p = await this.find(id)
    const updated = await this.prisma.$transaction(async (tx) => {
      if (p.published) await recordVersion(tx, { entityType: 'project', entityId: id, action: 'unpublish', snapshot: p.published, authorId: u.id })
      return tx.project.update({ where: { id }, data: { status: 'DRAFT', published: Prisma.DbNull, publishedAt: null, publishAt: null } })
    })
    this.cache.invalidate()
    await this.audit.record({ action: 'project.unpublish', actor: u, resourceType: 'project', resourceId: id, req })
    return toAdmin(updated)
  }

  async archive(u: RequestUser, id: string, req: Request) {
    await this.find(id)
    const updated = await this.prisma.project.update({ where: { id }, data: { status: 'ARCHIVED', publishAt: null } })
    this.cache.invalidate()
    await this.audit.record({ action: 'project.archive', actor: u, resourceType: 'project', resourceId: id, req })
    return toAdmin(updated)
  }

  async reorder(u: RequestUser, ids: string[], req: Request) {
    await this.prisma.$transaction(ids.map((id, order) => this.prisma.project.updateMany({ where: { id }, data: { order } })))
    this.cache.invalidate()
    await this.audit.record({ action: 'project.reorder', actor: u, resourceType: 'project', metadata: { count: ids.length }, req })
    return { ok: true }
  }

  async remove(u: RequestUser, id: string, permanent: boolean, req: Request) {
    const p = await this.find(id)
    if (permanent) {
      await this.prisma.$transaction([
        this.prisma.contentVersion.deleteMany({ where: { entityType: 'project', entityId: id } }),
        this.prisma.project.delete({ where: { id } }),
      ])
    } else {
      await this.prisma.project.update({ where: { id }, data: { deletedAt: new Date(), publishAt: null } })
    }
    this.cache.invalidate()
    const action = permanent ? 'project.delete' : 'project.trash'
    await this.audit.record({ action, actor: u, resourceType: 'project', resourceId: id, metadata: { slug: p.slug }, req })
    return { ok: true }
  }

  async restore(u: RequestUser, id: string, req: Request) {
    const p = await this.find(id)
    if (!p.deletedAt) throw new ConflictException('This project is not in the trash')
    const updated = await this.prisma.project.update({ where: { id }, data: { deletedAt: null } })
    this.cache.invalidate()
    await this.audit.record({ action: 'project.restore', actor: u, resourceType: 'project', resourceId: id, req })
    return toAdmin(updated)
  }
}
