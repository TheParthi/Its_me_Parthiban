import { Controller, Get, Query } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { z } from 'zod'
import { RequirePermissions } from '../common/decorators'
import { parse } from '../common/zod'
import { PrismaService } from '../prisma/prisma.service'

const query = z.object({
  q: z.string().max(100).optional(),
  action: z.string().max(80).optional(),
  actorId: z.string().max(64).optional(),
  success: z.enum(['true', 'false']).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  cursor: z.string().regex(/^\d+$/).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

@ApiTags('audit')
@Controller('admin/audit')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  /** Newest first, cursor-paginated. Read-only: there is no write endpoint. */
  @Get()
  @RequirePermissions('audit:read')
  async list(@Query() raw: unknown) {
    const q = parse(query, raw)
    const where = {
      ...(q.action ? { action: { startsWith: q.action } } : {}),
      ...(q.actorId ? { actorId: q.actorId } : {}),
      ...(q.success ? { success: q.success === 'true' } : {}),
      ...(q.from || q.to ? { createdAt: { ...(q.from ? { gte: new Date(q.from) } : {}), ...(q.to ? { lte: new Date(q.to) } : {}) } } : {}),
      ...(q.q
        ? {
            OR: [
              { action: { contains: q.q, mode: 'insensitive' as const } },
              { actorEmail: { contains: q.q, mode: 'insensitive' as const } },
              { resourceType: { contains: q.q, mode: 'insensitive' as const } },
              { resourceId: { contains: q.q } },
            ],
          }
        : {}),
      ...(q.cursor ? { id: { lt: BigInt(q.cursor) } } : {}),
    }
    const rows = await this.prisma.adminAuditLog.findMany({ where, orderBy: { id: 'desc' }, take: q.limit + 1 })
    const page = rows.slice(0, q.limit)
    return {
      items: page.map((r) => ({ ...r, id: r.id.toString() })),
      nextCursor: rows.length > q.limit ? page[page.length - 1].id.toString() : null,
    }
  }
}
