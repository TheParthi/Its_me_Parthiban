import { HttpException, Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { AuditService } from '../audit/audit.service'
import { NotificationsService } from '../notifications/notifications.service'
import { PrismaService } from '../prisma/prisma.service'
import { ProjectsService } from './projects.service'

/** Publishes scheduled projects once their `publishAt` passes. */
@Injectable()
export class ContentScheduler {
  private readonly log = new Logger('Scheduler')
  private running = false

  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async publishDue() {
    if (this.running) return 0
    this.running = true
    try {
      const due = await this.prisma.project.findMany({
        where: { publishAt: { lte: new Date() }, deletedAt: null },
        select: { id: true, title: true },
      })
      for (const p of due) {
        try {
          await this.projects.publishNow(p.id, null)
          await this.audit.record({ action: 'project.publish_scheduled', actor: null, resourceType: 'project', resourceId: p.id })
        } catch (err) {
          // Clear the schedule so a broken draft is reported once, not every minute.
          await this.prisma.project.update({ where: { id: p.id }, data: { publishAt: null } })
          const reason = err instanceof HttpException ? err.message : 'Unexpected error'
          this.log.error(`Scheduled publish of ${p.id} failed: ${(err as Error).message}`)
          await this.audit.record({ action: 'project.publish_scheduled', actor: null, resourceType: 'project', resourceId: p.id, success: false, metadata: { reason } })
          await this.notifications.create({
            type: 'publish_failed',
            title: `Scheduled publish failed: ${p.title}`,
            body: reason,
            link: `/projects/${p.id}`,
            permission: 'content:publish',
          })
        }
      }
      return due.length
    } finally {
      this.running = false
    }
  }
}
