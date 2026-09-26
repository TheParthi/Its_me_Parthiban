import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import type { Request } from 'express'
import { z } from 'zod'
import { MESSAGE_STATUS, MessageStatus, contactSubmitSchema } from '@pg/shared'
import { Prisma } from '@prisma/client'
import { AuditService } from '../audit/audit.service'
import type { RequestUser } from '../common/decorators'
import { MailerService } from '../common/mailer.service'
import { env } from '../config/env'
import { NotificationsService } from '../notifications/notifications.service'
import { PrismaService } from '../prisma/prisma.service'
import { SettingsService } from '../settings/settings.service'

/** The shared schema rejects a filled honeypot; here it is accepted and quietly marked as spam instead. */
export const contactInputSchema = contactSubmitSchema.extend({ website: z.string().max(2000).optional().default('') })
export const messageListSchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: z.enum(MESSAGE_STATUS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
})
export const messageStatusSchema = z.object({ status: z.enum(MESSAGE_STATUS) })
export const messageExportSchema = z.object({ ids: z.array(z.string().min(1).max(64)).min(1).max(1000) })

const MIN_ELAPSED_MS = 3000
const MAX_LINKS = 5

/** Quoted CSV cell; leading formula characters are neutralised for spreadsheet apps. */
export function csvCell(v: unknown) {
  let s = v instanceof Date ? v.toISOString() : String(v ?? '')
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

@Injectable()
export class ContactService {
  private readonly log = new Logger('Contact')
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly notifications: NotificationsService,
    private readonly mailer: MailerService,
    private readonly audit: AuditService,
  ) {}

  async submit(b: z.infer<typeof contactInputSchema>) {
    const s = await this.settings.get()
    if (!s.contact.enabled) throw new ServiceUnavailableException('The contact form is currently closed')
    const links = (b.message.match(/https?:\/\/|www\./gi) ?? []).length
    const spam = b.website.length > 0 || b.elapsedMs < MIN_ELAPSED_MS || links > MAX_LINKS
    const msg = await this.prisma.contactMessage.create({
      data: { name: b.name, email: b.email, subject: b.subject, message: b.message, status: spam ? 'SPAM' : 'NEW' },
    })
    if (spam) return { ok: true } // same answer as a real submission

    const title = b.subject.length > 80 ? `${b.subject.slice(0, 79)}…` : b.subject
    await this.notifications.create({ type: 'message', title: 'New contact message', body: title, link: `/messages/${msg.id}`, permission: 'messages:read' })
    const to = env().NOTIFY_EMAIL
    if (s.contact.notifyByEmail && to) {
      // Without SMTP the mailer logs the text, so the body is only included when it will really be emailed.
      const text = this.mailer.configured
        ? `From: ${b.name} <${b.email}>\nSubject: ${b.subject}\n\n${b.message}`
        : `New message from ${b.name}. Open the admin dashboard to read it.`
      this.mailer.send(to, `New contact message: ${title}`, text).catch((e) => this.log.error(`Notification email failed: ${(e as Error).message}`))
    }
    return { ok: true }
  }

  async list(q: z.infer<typeof messageListSchema>) {
    const search: Prisma.ContactMessageWhereInput = q.q
      ? { OR: (['name', 'email', 'subject', 'message'] as const).map((f) => ({ [f]: { contains: q.q, mode: 'insensitive' as const } })) }
      : {}
    const where = { ...search, ...(q.status ? { status: q.status } : {}) }
    const [items, total, grouped] = await this.prisma.$transaction([
      this.prisma.contactMessage.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
      this.prisma.contactMessage.count({ where }),
      this.prisma.contactMessage.groupBy({ by: ['status'], where: search, orderBy: { status: 'asc' }, _count: { _all: true } }),
    ])
    const counts = Object.fromEntries(MESSAGE_STATUS.map((st) => [st, 0])) as Record<MessageStatus, number>
    for (const g of grouped) counts[g.status] = (g._count as { _all: number })._all
    return { items, total, counts }
  }

  private async find(id: string) {
    const m = await this.prisma.contactMessage.findUnique({ where: { id } })
    if (!m) throw new NotFoundException('Message not found')
    return m
  }

  async get(id: string) {
    const m = await this.find(id)
    return m.status === 'NEW' ? this.prisma.contactMessage.update({ where: { id }, data: { status: 'READ' } }) : m
  }

  async setStatus(u: RequestUser, id: string, status: MessageStatus, req: Request) {
    const before = await this.find(id)
    const m = await this.prisma.contactMessage.update({ where: { id }, data: { status } })
    await this.audit.record({ action: 'message.status', actor: u, resourceType: 'message', resourceId: id, metadata: { from: before.status, to: status }, req })
    return m
  }

  async remove(u: RequestUser, id: string, req: Request) {
    await this.find(id)
    await this.prisma.contactMessage.delete({ where: { id } })
    await this.audit.record({ action: 'message.delete', actor: u, resourceType: 'message', resourceId: id, req })
    return { ok: true }
  }

  async exportCsv(u: RequestUser, ids: string[], req: Request) {
    const rows = await this.prisma.contactMessage.findMany({ where: { id: { in: ids } }, orderBy: { createdAt: 'asc' } })
    const cols = ['id', 'createdAt', 'status', 'name', 'email', 'subject', 'message'] as const
    const lines = [cols.map(csvCell).join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))]
    await this.audit.record({ action: 'message.export', actor: u, resourceType: 'message', metadata: { count: rows.length, ids: rows.map((r) => r.id) }, req })
    return `﻿${lines.join('\r\n')}\r\n`
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purge() {
    const days = (await this.settings.get()).contact.retentionDays
    const { count } = await this.prisma.contactMessage.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - days * 86_400_000) } } })
    if (count) this.log.log(`Retention: removed ${count} contact messages older than ${days} days`)
    return count
  }
}
