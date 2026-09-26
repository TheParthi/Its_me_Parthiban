import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import type { Request } from 'express'
import { isbot } from 'isbot'
import type { AnalyticsBatch } from '@pg/shared'
import { uaSummary } from '../common/request-meta'
import { PrismaService } from '../prisma/prisma.service'
import { SettingsService } from '../settings/settings.service'
import { cdnGeo, classifySource, optedOut, referrerDomain } from './classify'

const MAX_ENGAGED_PER_BATCH = 300
const MAX_CLOCK_SKEW_MS = 30 * 60_000

/** Ingests beacon batches. Stores no IP address, no full user agent and no free text. */
@Injectable()
export class CollectorService {
  private readonly log = new Logger('Analytics')
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  /** Returns false when the batch was intentionally dropped. */
  async ingest(batch: AnalyticsBatch, req: Request): Promise<boolean> {
    const s = await this.settings.get()
    if (!s.analytics.enabled) return false
    if (isbot(req.headers['user-agent'] ?? '')) return false
    if (s.analytics.respectDoNotTrack && optedOut(req)) return false

    const now = Date.now()
    // Client timestamps only order events within a sane window; the server clock wins otherwise.
    const at = (ts?: number) => new Date(ts && ts <= now && ts >= now - MAX_CLOCK_SKEW_MS ? ts : now)
    const events = batch.events
    const pageViews = events.filter((e) => e.type === 'PAGE_VIEW').length
    const stored = events.filter((e) => e.type !== 'HEARTBEAT')
    const engaged = Math.min(
      MAX_ENGAGED_PER_BATCH,
      events.filter((e) => e.type === 'HEARTBEAT' || e.type === 'SECTION_VIEW').reduce((n, e) => n + (e.value ?? 0), 0),
    )
    const currentPath = events[events.length - 1].path
    const visitorId = batch.visitorId ?? null

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.analyticsSession.findUnique({ where: { id: batch.sessionId }, select: { visitorId: true } })
      let isNewVisitor = true
      if (visitorId) {
        const v = await tx.analyticsVisitor.findUnique({ where: { id: visitorId }, select: { id: true } })
        if (v) await tx.analyticsVisitor.update({ where: { id: visitorId }, data: { lastSeenAt: new Date(now) } })
        else await tx.analyticsVisitor.create({ data: { id: visitorId } })
        // Returning = the visitor had a session before this one.
        isNewVisitor = !v || (await tx.analyticsSession.count({ where: { visitorId, id: { not: batch.sessionId } } })) === 0
      }
      const linkVisitor = visitorId && !existing?.visitorId ? { visitorId, isNewVisitor } : {}

      if (!existing) {
        const ua = uaSummary(req)
        const { source, referrerDomain: domain } = classifySource(referrerDomain(batch.referrer), batch.utm)
        const landing = events.find((e) => e.type === 'PAGE_VIEW') ?? events[0]
        await tx.analyticsSession.upsert({
          where: { id: batch.sessionId },
          create: {
            id: batch.sessionId,
            visitorId,
            isNewVisitor,
            startedAt: at(events[0].ts),
            lastSeenAt: new Date(now),
            landingPath: landing.path,
            currentPath,
            referrerDomain: domain,
            source,
            utmSource: batch.utm?.source || null,
            utmMedium: batch.utm?.medium || null,
            utmCampaign: batch.utm?.campaign || null,
            device: ua.device,
            browser: ua.browser,
            os: ua.os,
            ...cdnGeo(req),
            pageViews,
            eventCount: stored.length,
            engagedSec: engaged,
          },
          // A concurrent first batch won the race: just add the counters.
          update: { lastSeenAt: new Date(now), currentPath, pageViews: { increment: pageViews }, eventCount: { increment: stored.length }, engagedSec: { increment: engaged } },
        })
      } else {
        await tx.analyticsSession.update({
          where: { id: batch.sessionId },
          data: {
            ...linkVisitor,
            lastSeenAt: new Date(now),
            currentPath,
            pageViews: { increment: pageViews },
            eventCount: { increment: stored.length },
            engagedSec: { increment: engaged },
          },
        })
      }

      if (stored.length) {
        await tx.analyticsEvent.createMany({
          data: stored.map((e) => ({
            sessionId: batch.sessionId,
            type: e.type,
            path: e.path,
            projectSlug: e.projectSlug || null,
            section: e.section || null,
            target: e.target || null,
            value: e.value ?? null,
            createdAt: at(e.ts),
          })),
        })
      }
    })
    return true
  }

  /** Sessions (and their events, by cascade) older than the retention window. */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purge() {
    const days = (await this.settings.get()).analytics.retentionDays
    const cutoff = new Date(Date.now() - days * 86_400_000)
    const { count } = await this.prisma.analyticsSession.deleteMany({ where: { startedAt: { lt: cutoff } } })
    await this.prisma.analyticsVisitor.deleteMany({ where: { lastSeenAt: { lt: cutoff }, sessions: { none: {} } } })
    if (count) this.log.log(`Retention: removed ${count} analytics sessions older than ${days} days`)
    return count
  }
}
