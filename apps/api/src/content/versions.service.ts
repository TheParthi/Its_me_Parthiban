import { Injectable, NotFoundException } from '@nestjs/common'
import type { Request } from 'express'
import { AuditService } from '../audit/audit.service'
import type { RequestUser } from '../common/decorators'
import { PrismaService } from '../prisma/prisma.service'
import { assertPerms, recordVersion } from './content-utils'
import { DOCS, DocKey, DocumentsService } from './documents.service'
import { ENTRY_KINDS, EntriesService, EntryKind } from './entries.service'
import { ProjectsService } from './projects.service'

const author = { select: { id: true, name: true, email: true } } as const
const isDoc = (t: string): t is DocKey => t in DOCS
const isEntry = (t: string): t is EntryKind => t in ENTRY_KINDS

@Injectable()
export class VersionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly docs: DocumentsService,
    private readonly projects: ProjectsService,
    private readonly entries: EntriesService,
  ) {}

  /** Documents are stored with their upper-case key as entityId (see seed). */
  private entityId(entityType: string, entityId: string) {
    return isDoc(entityType) ? entityId.toUpperCase() : entityId
  }

  async list(entityType: string, entityId: string) {
    const rows = await this.prisma.contentVersion.findMany({
      where: { entityType, entityId: this.entityId(entityType, entityId) },
      select: { id: true, version: true, action: true, createdAt: true, author },
      orderBy: { version: 'desc' },
      take: 100,
    })
    return rows
  }

  async get(id: string) {
    const v = await this.prisma.contentVersion.findUnique({ where: { id }, include: { author } })
    if (!v) throw new NotFoundException('Version not found')
    const { authorId, ...rest } = v
    return rest
  }

  /** Copies a snapshot back into the draft. Publishing stays a separate, explicit step. */
  async restore(u: RequestUser, id: string, req: Request) {
    const v = await this.get(id)
    const { entityType, entityId, snapshot } = v
    if (isDoc(entityType)) {
      if (entityType !== 'profile') assertPerms(u, 'site:write')
      await this.docs.saveDraft(entityType, snapshot, u.id)
    } else if (entityType === 'project') {
      await this.projects.get(entityId) // 404 once purged
      await this.projects.saveDraft(entityId, snapshot, u.id)
    } else if (isEntry(entityType)) {
      await this.entries.find(entityType, entityId)
      await this.entries.saveDraft(entityType, entityId, snapshot, u.id)
    } else {
      throw new NotFoundException('This version cannot be restored')
    }
    const created = await this.prisma.$transaction((tx) => recordVersion(tx, { entityType, entityId, action: 'restore', snapshot, authorId: u.id }))
    await this.audit.record({ action: `${entityType}.restore_version`, actor: u, resourceType: entityType, resourceId: entityId, metadata: { version: v.version }, req })
    return { ok: true, entityType, entityId, restoredVersion: v.version, version: created.version }
  }
}
