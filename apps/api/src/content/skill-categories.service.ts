import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import type { Request } from 'express'
import { SkillCategoryInput } from '@pg/shared'
import { AuditService } from '../audit/audit.service'
import type { RequestUser } from '../common/decorators'
import { PrismaService } from '../prisma/prisma.service'
import { PublicCacheService } from '../public/public-cache.service'
import { uniqueOr409 } from './content-utils'

const NAME_TAKEN = 'A category with this name already exists'

/** Categories have no draft state: name and colour changes are live immediately. */
@Injectable()
export class SkillCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly cache: PublicCacheService,
  ) {}

  async list() {
    const rows = await this.prisma.skillCategory.findMany({ orderBy: [{ order: 'asc' }, { name: 'asc' }], include: { _count: { select: { skills: true } } } })
    const items = rows.map(({ _count, ...c }) => ({ ...c, skillCount: _count.skills }))
    return { items, total: items.length }
  }

  async create(u: RequestUser, b: SkillCategoryInput, req: Request) {
    const max = await this.prisma.skillCategory.aggregate({ _max: { order: true } })
    const c = await uniqueOr409(() => this.prisma.skillCategory.create({ data: { ...b, order: (max._max.order ?? -1) + 1 } }), NAME_TAKEN)
    this.cache.invalidate()
    await this.audit.record({ action: 'skill_category.create', actor: u, resourceType: 'skill_category', resourceId: c.id, metadata: { name: c.name }, req })
    return c
  }

  async update(u: RequestUser, id: string, b: Partial<SkillCategoryInput>, req: Request) {
    if (!(await this.prisma.skillCategory.findUnique({ where: { id } }))) throw new NotFoundException('Category not found')
    const c = await uniqueOr409(() => this.prisma.skillCategory.update({ where: { id }, data: b }), NAME_TAKEN)
    this.cache.invalidate()
    await this.audit.record({ action: 'skill_category.update', actor: u, resourceType: 'skill_category', resourceId: id, metadata: b, req })
    return c
  }

  async remove(u: RequestUser, id: string, req: Request) {
    const c = await this.prisma.skillCategory.findUnique({ where: { id }, include: { _count: { select: { skills: true } } } })
    if (!c) throw new NotFoundException('Category not found')
    if (c._count.skills > 0) throw new ConflictException('Move or delete the skills in this category first')
    await this.prisma.skillCategory.delete({ where: { id } })
    this.cache.invalidate()
    await this.audit.record({ action: 'skill_category.delete', actor: u, resourceType: 'skill_category', resourceId: id, metadata: { name: c.name }, req })
    return { ok: true }
  }

  async reorder(u: RequestUser, ids: string[], req: Request) {
    await this.prisma.$transaction(ids.map((id, order) => this.prisma.skillCategory.updateMany({ where: { id }, data: { order } })))
    this.cache.invalidate()
    await this.audit.record({ action: 'skill_category.reorder', actor: u, resourceType: 'skill_category', metadata: { count: ids.length }, req })
    return { ok: true }
  }
}
