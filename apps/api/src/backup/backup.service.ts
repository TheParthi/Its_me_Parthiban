import { Injectable } from '@nestjs/common'
import type { Request } from 'express'
import { Prisma } from '@prisma/client'
import { AuditService } from '../audit/audit.service'
import type { RequestUser } from '../common/decorators'
import { parse } from '../common/zod'
import { PrismaService } from '../prisma/prisma.service'
import { PublicCacheService } from '../public/public-cache.service'
import { BACKUP_FORMAT, BACKUP_VERSION, Backup, backupSchema } from './backup.schema'

const json = (v: unknown) => v as Prisma.InputJsonValue
const jsonOrNull = (v: unknown) => (v == null ? Prisma.DbNull : json(v))
const entrySelect = { id: true, order: true, status: true, draft: true, published: true, publishedAt: true, deletedAt: true } as const
type EntryRow = Pick<Backup['experience'][number], 'id' | 'order' | 'status' | 'publishedAt' | 'deletedAt'> & { draft: unknown; published: unknown }
const byOrder = { orderBy: { order: 'asc' as const } }

/**
 * Content-only backup. Users, sessions, tokens, analytics, messages, audit and
 * runtime settings are deliberately excluded; media is metadata only (no files).
 */
@Injectable()
export class BackupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly cache: PublicCacheService,
  ) {}

  async export(u: RequestUser, req: Request) {
    const p = this.prisma
    const [documents, projects, skillCategories, skills, experience, education, certifications, achievements, media] = await Promise.all([
      p.siteDocument.findMany({ where: { key: { not: 'SETTINGS' } }, select: { key: true, draft: true, published: true, status: true, publishedAt: true } }),
      p.project.findMany({ select: { ...entrySelect, publishAt: true }, ...byOrder }),
      p.skillCategory.findMany({ select: { id: true, name: true, color: true, order: true }, ...byOrder }),
      p.skill.findMany({ select: entrySelect, ...byOrder }),
      p.experience.findMany({ select: entrySelect, ...byOrder }),
      p.education.findMany({ select: entrySelect, ...byOrder }),
      p.certification.findMany({ select: entrySelect, ...byOrder }),
      p.achievement.findMany({ select: entrySelect, ...byOrder }),
      p.mediaAsset.findMany({
        select: {
          id: true, storageKey: true, url: true, fileName: true, originalName: true, mimeType: true, size: true,
          width: true, height: true, alt: true, category: true, checksum: true, createdAt: true,
        },
      }),
    ])
    await this.audit.record({ action: 'backup.export', actor: u, resourceType: 'backup', req })
    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      documents,
      projects,
      skillCategories,
      skills,
      experience,
      education,
      certifications,
      achievements,
      media,
    }
  }

  /** Validates the entire payload first, then replaces all content in one transaction. */
  async restore(u: RequestUser, body: unknown, req: Request) {
    const b: Backup = parse(backupSchema, body)
    const entry = (e: EntryRow) => ({
      id: e.id,
      order: e.order,
      status: e.status,
      draft: json(e.draft),
      published: jsonOrNull(e.published),
      publishedAt: e.publishedAt,
      deletedAt: e.deletedAt ?? null,
      updatedById: u.id,
    })

    await this.prisma.$transaction(
      async (tx) => {
        await tx.projectTechnology.deleteMany()
        await tx.project.deleteMany()
        await tx.skill.deleteMany()
        await tx.skillCategory.deleteMany()
        await tx.experience.deleteMany()
        await tx.education.deleteMany()
        await tx.certification.deleteMany()
        await tx.achievement.deleteMany()
        await tx.siteDocument.deleteMany({ where: { key: { not: 'SETTINGS' } } })

        await tx.siteDocument.createMany({
          data: b.documents.map((d) => ({
            key: d.key,
            draft: json(d.draft),
            published: jsonOrNull(d.published),
            status: d.status,
            publishedAt: d.publishedAt,
            updatedById: u.id,
          })),
        })
        await tx.project.createMany({
          data: b.projects.map((p) => ({
            ...entry(p),
            slug: p.draft.slug,
            title: p.draft.title,
            featured: p.draft.featured,
            publishAt: p.publishAt ?? null,
          })),
        })
        await tx.projectTechnology.createMany({
          data: b.projects.flatMap((p) => [...new Set(p.draft.technologies)].map((name, order) => ({ projectId: p.id, name, order }))),
        })
        await tx.skillCategory.createMany({ data: b.skillCategories })
        await tx.skill.createMany({
          data: b.skills.map((s) => ({ ...entry(s), name: s.draft.name, categoryId: s.draft.categoryId })),
        })
        await tx.experience.createMany({ data: b.experience.map(entry) })
        await tx.education.createMany({ data: b.education.map(entry) })
        await tx.certification.createMany({ data: b.certifications.map(entry) })
        await tx.achievement.createMany({ data: b.achievements.map(entry) })
        // Media files are not in the backup; only add metadata rows that are missing.
        await tx.mediaAsset.createMany({ data: b.media, skipDuplicates: true })

        // One 'import' version per published item, continuing each entity's numbering.
        const imported = [
          ...b.documents.filter((d) => d.published).map((d) => ({ entityType: d.key.toLowerCase(), entityId: d.key, snapshot: d.published })),
          ...b.projects.filter((p) => p.published).map((p) => ({ entityType: 'project', entityId: p.id, snapshot: p.published })),
          ...b.skills.filter((s) => s.published).map((s) => ({ entityType: 'skill', entityId: s.id, snapshot: s.published })),
          ...b.experience.filter((e) => e.published).map((e) => ({ entityType: 'experience', entityId: e.id, snapshot: e.published })),
          ...b.education.filter((e) => e.published).map((e) => ({ entityType: 'education', entityId: e.id, snapshot: e.published })),
          ...b.certifications.filter((e) => e.published).map((e) => ({ entityType: 'certification', entityId: e.id, snapshot: e.published })),
          ...b.achievements.filter((e) => e.published).map((e) => ({ entityType: 'achievement', entityId: e.id, snapshot: e.published })),
        ]
        const max = await tx.contentVersion.groupBy({ by: ['entityType', 'entityId'], _max: { version: true } })
        const last = new Map(max.map((m) => [`${m.entityType}:${m.entityId}`, m._max.version ?? 0]))
        await tx.contentVersion.createMany({
          data: imported.map((v) => ({
            ...v,
            snapshot: json(v.snapshot),
            version: (last.get(`${v.entityType}:${v.entityId}`) ?? 0) + 1,
            action: 'import',
            authorId: u.id,
          })),
        })
      },
      { timeout: 60_000, maxWait: 10_000 },
    )
    this.cache.invalidate()
    const counts = {
      documents: b.documents.length,
      projects: b.projects.length,
      skillCategories: b.skillCategories.length,
      skills: b.skills.length,
      experience: b.experience.length,
      education: b.education.length,
      certifications: b.certifications.length,
      achievements: b.achievements.length,
      media: b.media.length,
    }
    await this.audit.record({ action: 'backup.restore', actor: u, resourceType: 'backup', metadata: { exportedAt: b.exportedAt.toISOString(), counts }, req })
    return { ok: true, counts }
  }
}
