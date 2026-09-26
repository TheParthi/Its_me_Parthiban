import { Injectable } from '@nestjs/common'
import type { Permission } from '@pg/shared'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** `permission` gates who sees it — keep bodies free of sensitive data. */
  create(n: { type: string; title: string; body?: string; link?: string; permission: Permission }) {
    return this.prisma.notification.create({ data: { ...n, body: n.body ?? '' } })
  }

  async forUser(userId: string, permissions: string[], limit = 30) {
    const rows = await this.prisma.notification.findMany({
      where: { permission: { in: permissions } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { reads: { where: { userId }, select: { readAt: true } } },
    })
    const items = rows.map(({ reads, ...n }) => ({ ...n, read: reads.length > 0 }))
    return { items, unread: items.filter((i) => !i.read).length }
  }

  async markRead(userId: string, permissions: string[], id?: string) {
    const targets = await this.prisma.notification.findMany({
      where: { permission: { in: permissions }, ...(id ? { id } : {}) },
      select: { id: true },
    })
    await this.prisma.notificationRead.createMany({
      data: targets.map((t) => ({ notificationId: t.id, userId })),
      skipDuplicates: true,
    })
    return { ok: true }
  }
}
