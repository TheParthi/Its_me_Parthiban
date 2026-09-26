import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

export interface SearchHit {
  id: string
  title: string
  subtitle: string
}

const LIMIT = 8
const insensitive = (q: string) => ({ contains: q, mode: 'insensitive' as const })

/** Admin quick search. Each group is only queried when the caller may read it. */
@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(raw: string, perms: string[]) {
    const q = raw.trim().slice(0, 100)
    const can = (p: string) => perms.includes(p)
    const out: Partial<Record<'projects' | 'skills' | 'experience' | 'messages' | 'media' | 'users', SearchHit[]>> = {}
    if (!q) return out
    const tasks: Promise<void>[] = []

    if (can('content:read')) {
      tasks.push(
        this.prisma.project
          .findMany({ where: { OR: [{ title: insensitive(q) }, { slug: insensitive(q) }] }, take: LIMIT, orderBy: { order: 'asc' } })
          .then((r) => void (out.projects = r.map((p) => ({ id: p.id, title: p.title, subtitle: p.deletedAt ? 'In trash' : p.status.toLowerCase() })))),
        this.prisma.skill
          .findMany({ where: { name: insensitive(q), deletedAt: null }, take: LIMIT, include: { category: true }, orderBy: { order: 'asc' } })
          .then((r) => void (out.skills = r.map((s) => ({ id: s.id, title: s.name, subtitle: s.category.name })))),
        this.experience(q).then((r) => void (out.experience = r)),
      )
    }
    if (can('messages:read')) {
      tasks.push(
        this.prisma.contactMessage
          .findMany({
            where: { OR: [{ name: insensitive(q) }, { email: insensitive(q) }, { subject: insensitive(q) }] },
            take: LIMIT,
            orderBy: { createdAt: 'desc' },
          })
          .then((r) => void (out.messages = r.map((m) => ({ id: m.id, title: m.subject, subtitle: m.name })))),
      )
    }
    if (can('media:read')) {
      tasks.push(
        this.prisma.mediaAsset
          .findMany({ where: { OR: [{ fileName: insensitive(q) }, { originalName: insensitive(q) }, { alt: insensitive(q) }] }, take: LIMIT, orderBy: { createdAt: 'desc' } })
          .then((r) => void (out.media = r.map((m) => ({ id: m.id, title: m.originalName || m.fileName, subtitle: m.mimeType })))),
      )
    }
    if (can('users:read')) {
      tasks.push(
        this.prisma.adminUser
          .findMany({ where: { OR: [{ name: insensitive(q) }, { email: insensitive(q) }] }, take: LIMIT, select: { id: true, name: true, email: true } })
          .then((r) => void (out.users = r.map((u) => ({ id: u.id, title: u.name, subtitle: u.email })))),
      )
    }
    await Promise.all(tasks)
    return out
  }

  /** Experience lives in JSON drafts, so match position/organisation with ILIKE. */
  private async experience(q: string): Promise<SearchHit[]> {
    const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
    const rows = await this.prisma.$queryRaw<{ id: string; position: string; organization: string }[]>(Prisma.sql`
      SELECT id, draft->>'position' AS position, draft->>'organization' AS organization
      FROM "Experience"
      WHERE "deletedAt" IS NULL AND (draft->>'position' ILIKE ${like} OR draft->>'organization' ILIKE ${like})
      ORDER BY "order" ASC LIMIT ${LIMIT}`)
    return rows.map((r) => ({ id: r.id, title: r.position, subtitle: r.organization }))
  }
}
