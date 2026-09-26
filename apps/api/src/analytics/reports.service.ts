import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { AnalyticsOverview, MetricWithDelta, RangeQuery } from '@pg/shared'
import { z } from 'zod'
import { sha256 } from '../common/crypto'
import { PrismaService } from '../prisma/prisma.service'
import { SettingsService } from '../settings/settings.service'

const DAY = 86_400_000
const CONVERSIONS = ['CONTACT_FORM_SUBMIT', 'RESUME_DOWNLOAD', 'GITHUB_CLICK', 'LINKEDIN_CLICK', 'PROJECT_CLICK']

export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
})

export interface Range {
  from: Date
  to: Date
  prevFrom: Date
  bucket: 'hour' | 'day'
  q: RangeQuery
}

type Row = { key: string | null; count: number }
const top = (rows: Row[], n = 10) =>
  rows
    .filter((r) => r.key)
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
    .map((r) => ({ key: r.key as string, count: r.count }))

/** Pseudonymous, short and not reversible to the stored browser id. */
const visitorHash = (id: string | null) => (id ? sha256(id).slice(0, 8) : null)

export const DEFINITIONS: Record<string, string> = {
  sessions: 'Visits started in the period. A visit ends when the tab is closed; a new tab is a new visit.',
  uniqueVisitors:
    'Distinct browsers. Only visitors who accepted analytics cookies can be recognised across visits; each visit without consent is counted once on its own.',
  pageViews: 'Pages (or single-page routes) shown to visitors.',
  projectViews: 'Times a project detail was opened.',
  avgEngagementSec: 'Average seconds per visit that the page was visible and in use (capped per report to ignore idle tabs).',
  engagementRate: 'Share of visits with at least 10 seconds of engaged time, 2 or more page views, or a conversion (contact form sent, résumé download, GitHub/LinkedIn or project link click).',
  contactSubmissions: 'Contact forms sent successfully, as reported by the browser.',
  newVisitors: 'Visits from browsers not seen before, including every visit without analytics consent (they cannot be recognised).',
  returningVisitors: 'Visits from consenting browsers that had visited before.',
  sources:
    'How a visit arrived: campaign (UTM tags), search engine, social network, other website (referral), direct (no referrer) or internal (from this site).',
  previous: 'Each card compares with the period of equal length immediately before.',
  accuracy: 'Numbers are approximate — ad blockers, Do Not Track, consent choices and network conditions hide some visitors.',
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  range(q: RangeQuery): Range {
    const now = new Date()
    let from: Date
    let to = now
    if (q.preset === 'custom') {
      if (!q.from || !q.to) throw new BadRequestException('Custom ranges need from and to')
      from = new Date(q.from)
      to = new Date(q.to)
      if (!(from < to)) throw new BadRequestException('from must be before to')
      if (to.getTime() - from.getTime() > 400 * DAY) throw new BadRequestException('Ranges are limited to 400 days')
    } else if (q.preset === 'today') {
      from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    } else {
      from = new Date(now.getTime() - Number(q.preset.replace('d', '')) * DAY)
    }
    const len = to.getTime() - from.getTime()
    return { from, to, prevFrom: new Date(from.getTime() - len), bucket: len <= 2 * DAY ? 'hour' : 'day', q }
  }

  private sessionWhere(r: Range, from: Date, to: Date): Prisma.AnalyticsSessionWhereInput {
    return {
      startedAt: { gte: from, lt: to },
      ...(r.q.source ? { source: r.q.source } : {}),
      ...(r.q.campaign ? { utmCampaign: r.q.campaign } : {}),
      ...(r.q.path ? { events: { some: { path: r.q.path } } } : {}),
    }
  }

  private eventWhere(r: Range, from: Date, to: Date, type?: string): Prisma.AnalyticsEventWhereInput {
    return {
      createdAt: { gte: from, lt: to },
      ...(type ? { type } : {}),
      ...(r.q.path ? { path: r.q.path } : {}),
      ...(r.q.source || r.q.campaign
        ? { session: { ...(r.q.source ? { source: r.q.source } : {}), ...(r.q.campaign ? { utmCampaign: r.q.campaign } : {}) } }
        : {}),
    }
  }

  /** SQL filter on sessions aliased `s`, matching sessionWhere/eventWhere. */
  private sqlFilter(r: Range) {
    const parts: Prisma.Sql[] = [Prisma.sql`TRUE`]
    if (r.q.source) parts.push(Prisma.sql`s."source" = ${r.q.source}`)
    if (r.q.campaign) parts.push(Prisma.sql`s."utmCampaign" = ${r.q.campaign}`)
    return Prisma.join(parts, ' AND ')
  }

  private async cards(r: Range, from: Date, to: Date) {
    const sw = this.sessionWhere(r, from, to)
    const count = (type: string) => this.prisma.analyticsEvent.count({ where: this.eventWhere(r, from, to, type) })
    const [sessions, visitors, anonymous, pageViews, projectViews, engagedAgg, engaged, submissions, fresh] = await Promise.all([
      this.prisma.analyticsSession.count({ where: sw }),
      this.prisma.analyticsSession.groupBy({ by: ['visitorId'], where: { ...sw, visitorId: { not: null } } }),
      this.prisma.analyticsSession.count({ where: { ...sw, visitorId: null } }),
      count('PAGE_VIEW'),
      count('PROJECT_VIEW'),
      this.prisma.analyticsSession.aggregate({ where: sw, _avg: { engagedSec: true } }),
      this.prisma.analyticsSession.count({
        where: { AND: [sw, { OR: [{ engagedSec: { gte: 10 } }, { pageViews: { gte: 2 } }, { events: { some: { type: { in: CONVERSIONS } } } }] }] },
      }),
      count('CONTACT_FORM_SUBMIT'),
      this.prisma.analyticsSession.count({ where: { ...sw, isNewVisitor: true } }),
    ])
    return {
      sessions,
      uniqueVisitors: visitors.length + anonymous,
      pageViews,
      projectViews,
      avgEngagementSec: Math.round(engagedAgg._avg.engagedSec ?? 0),
      engagementRate: sessions ? Math.round((engaged / sessions) * 1000) / 1000 : 0,
      contactSubmissions: submissions,
      newVisitors: fresh,
      returningVisitors: sessions - fresh,
    }
  }

  private buckets(r: Range) {
    const step = r.bucket === 'hour' ? 3_600_000 : DAY
    const start = new Date(r.from)
    if (r.bucket === 'hour') start.setUTCMinutes(0, 0, 0)
    else start.setUTCHours(0, 0, 0, 0)
    const out: string[] = []
    for (let t = start.getTime(); t < r.to.getTime(); t += step) out.push(new Date(t).toISOString())
    return out
  }

  private async series(r: Range) {
    const unit = Prisma.raw(r.bucket === 'hour' ? `'hour'` : `'day'`)
    const from = r.from.toISOString()
    const to = r.to.toISOString()
    const f = this.sqlFilter(r)
    const pathSession = r.q.path
      ? Prisma.sql`AND EXISTS (SELECT 1 FROM "AnalyticsEvent" p WHERE p."sessionId" = s.id AND p.path = ${r.q.path})`
      : Prisma.empty
    const pathEvent = r.q.path ? Prisma.sql`AND e.path = ${r.q.path}` : Prisma.empty
    // Columns are UTC timestamps without time zone; compare in UTC explicitly.
    const [sessions, events] = await Promise.all([
      this.prisma.$queryRaw<{ t: Date; n: number }[]>`
        SELECT date_trunc(${unit}, s."startedAt") AS t, count(*)::int AS n
        FROM "AnalyticsSession" s
        WHERE s."startedAt" >= (${from}::timestamptz AT TIME ZONE 'UTC') AND s."startedAt" < (${to}::timestamptz AT TIME ZONE 'UTC')
          AND ${f} ${pathSession}
        GROUP BY 1`,
      this.prisma.$queryRaw<{ t: Date; views: number; submissions: number }[]>`
        SELECT date_trunc(${unit}, e."createdAt") AS t,
          count(*) FILTER (WHERE e.type = 'PAGE_VIEW')::int AS views,
          count(*) FILTER (WHERE e.type = 'CONTACT_FORM_SUBMIT')::int AS submissions
        FROM "AnalyticsEvent" e JOIN "AnalyticsSession" s ON s.id = e."sessionId"
        WHERE e."createdAt" >= (${from}::timestamptz AT TIME ZONE 'UTC') AND e."createdAt" < (${to}::timestamptz AT TIME ZONE 'UTC')
          AND e.type IN ('PAGE_VIEW', 'CONTACT_FORM_SUBMIT') AND ${f} ${pathEvent}
        GROUP BY 1`,
    ])
    // Prisma reads `timestamp` as UTC, so ISO keys line up with buckets().
    const s = new Map(sessions.map((x) => [x.t.toISOString(), x.n]))
    const e = new Map(events.map((x) => [x.t.toISOString(), x]))
    return this.buckets(r).map((t) => ({ t, sessions: s.get(t) ?? 0, pageViews: e.get(t)?.views ?? 0, submissions: e.get(t)?.submissions ?? 0 }))
  }

  private async groupSessions(field: 'device' | 'browser' | 'os' | 'source' | 'referrerDomain' | 'utmCampaign' | 'country', where: Prisma.AnalyticsSessionWhereInput, n = 10) {
    const rows = await this.prisma.analyticsSession.groupBy({ by: [field], where, _count: { _all: true } })
    return top(rows.map((x) => ({ key: x[field] as string | null, count: x._count._all })), n)
  }

  private async groupEvents(field: 'path' | 'projectSlug' | 'target', where: Prisma.AnalyticsEventWhereInput, n = 10) {
    const rows = await this.prisma.analyticsEvent.groupBy({ by: [field], where, _count: { _all: true } })
    return top(rows.map((x) => ({ key: x[field] as string | null, count: x._count._all })), n)
  }

  async overview(q: RangeQuery): Promise<AnalyticsOverview> {
    const r = this.range(q)
    const sw = this.sessionWhere(r, r.from, r.to)
    const ew = (type: string) => this.eventWhere(r, r.from, r.to, type)
    const [cur, prev, series, devices, browsers, os, sources, referrers, campaigns, countries, topPages, topProjects, clicks] = await Promise.all([
      this.cards(r, r.from, r.to),
      this.cards(r, r.prevFrom, r.from),
      this.series(r),
      this.groupSessions('device', sw),
      this.groupSessions('browser', sw),
      this.groupSessions('os', sw),
      this.groupSessions('source', sw),
      this.groupSessions('referrerDomain', sw),
      this.groupSessions('utmCampaign', sw),
      this.groupSessions('country', sw, 20),
      this.groupEvents('path', ew('PAGE_VIEW')),
      this.groupEvents('projectSlug', ew('PROJECT_VIEW')),
      this.prisma.analyticsEvent.groupBy({
        by: ['type'],
        where: { ...ew(''), type: { in: ['GITHUB_CLICK', 'LINKEDIN_CLICK', 'RESUME_DOWNLOAD', 'CTA_CLICK'] } },
        _count: { _all: true },
      }),
    ])
    const click = (t: string) => clicks.find((c) => c.type === t)?._count._all ?? 0
    const cards = Object.fromEntries(
      (Object.keys(cur) as (keyof typeof cur)[]).map((k) => [k, { value: cur[k], previous: prev[k] } satisfies MetricWithDelta]),
    ) as AnalyticsOverview['cards']
    return {
      range: { from: r.from.toISOString(), to: r.to.toISOString(), bucket: r.bucket },
      cards,
      series,
      devices,
      browsers,
      os,
      sources,
      referrers,
      campaigns,
      countries,
      topPages,
      topProjects,
      clicks: { github: click('GITHUB_CLICK'), linkedin: click('LINKEDIN_CLICK'), resume: click('RESUME_DOWNLOAD'), cta: click('CTA_CLICK') },
      definitions: DEFINITIONS,
    }
  }

  async projects(q: RangeQuery) {
    const r = this.range(q)
    const from = r.from.toISOString()
    const to = r.to.toISOString()
    const f = this.sqlFilter(r)
    const [stats, sources, projects] = await Promise.all([
      this.prisma.$queryRaw<{ slug: string; type: string; target: string; n: number; sessions: number; total: number }[]>`
        SELECT e."projectSlug" AS slug, e.type, coalesce(e.target, '') AS target, count(*)::int AS n,
          count(DISTINCT e."sessionId")::int AS sessions, coalesce(sum(e.value), 0)::int AS total
        FROM "AnalyticsEvent" e JOIN "AnalyticsSession" s ON s.id = e."sessionId"
        WHERE e."projectSlug" IS NOT NULL AND e.type IN ('PROJECT_VIEW', 'PROJECT_CLICK', 'SECTION_VIEW')
          AND e."createdAt" >= (${from}::timestamptz AT TIME ZONE 'UTC') AND e."createdAt" < (${to}::timestamptz AT TIME ZONE 'UTC') AND ${f}
        GROUP BY 1, 2, 3`,
      this.prisma.$queryRaw<{ slug: string; source: string; n: number }[]>`
        SELECT e."projectSlug" AS slug, s.source, count(DISTINCT e."sessionId")::int AS n
        FROM "AnalyticsEvent" e JOIN "AnalyticsSession" s ON s.id = e."sessionId"
        WHERE e."projectSlug" IS NOT NULL AND e.type = 'PROJECT_VIEW'
          AND e."createdAt" >= (${from}::timestamptz AT TIME ZONE 'UTC') AND e."createdAt" < (${to}::timestamptz AT TIME ZONE 'UTC') AND ${f}
        GROUP BY 1, 2`,
      this.prisma.project.findMany({ where: { deletedAt: null }, select: { slug: true, title: true }, orderBy: { order: 'asc' } }),
    ])
    const titles = new Map(projects.map((p) => [p.slug, p.title]))
    const slugs = [...new Set([...projects.map((p) => p.slug), ...stats.map((s) => s.slug)])]
    const items = slugs.map((slug) => {
      const rows = stats.filter((s) => s.slug === slug)
      const views = rows.filter((x) => x.type === 'PROJECT_VIEW').reduce((n, x) => n + x.n, 0)
      const uniqueSessions = rows.find((x) => x.type === 'PROJECT_VIEW')?.sessions ?? 0
      const clicks = rows.filter((x) => x.type === 'PROJECT_CLICK')
      const clicksOn = (...t: string[]) => clicks.filter((x) => t.includes(x.target.toLowerCase())).reduce((n, x) => n + x.n, 0)
      const allClicks = clicks.reduce((n, x) => n + x.n, 0)
      const section = rows.filter((x) => x.type === 'SECTION_VIEW')
      const engagedSessions = section.reduce((n, x) => n + x.sessions, 0)
      return {
        slug,
        title: titles.get(slug) ?? slug,
        views,
        uniqueSessions,
        avgEngagementSec: engagedSessions ? Math.round(section.reduce((n, x) => n + x.total, 0) / engagedSessions) : null,
        demoClicks: clicksOn('demo'),
        githubClicks: clicksOn('repo', 'github'),
        otherClicks: allClicks - clicksOn('demo', 'repo', 'github'),
        ctr: views > 0 ? Math.round((allClicks / views) * 1000) / 1000 : null,
        sources: top(sources.filter((s) => s.slug === slug).map((s) => ({ key: s.source, count: s.n }))),
      }
    })
    items.sort((a, b) => b.views - a.views)
    return { range: { from: r.from.toISOString(), to: r.to.toISOString() }, items }
  }

  async sources(q: RangeQuery) {
    const r = this.range(q)
    const sw = this.sessionWhere(r, r.from, r.to)
    const [sources, referrers, campaigns] = await Promise.all([
      this.groupSessions('source', sw, 20),
      this.groupSessions('referrerDomain', sw, 50),
      this.groupSessions('utmCampaign', sw, 50),
    ])
    return { range: { from: r.from.toISOString(), to: r.to.toISOString() }, sources, referrers, campaigns }
  }

  async journeys(q: RangeQuery) {
    const r = this.range(q)
    const events = await this.prisma.analyticsEvent.findMany({
      where: {
        type: { in: ['PAGE_VIEW', 'PROJECT_VIEW', 'PROJECT_CLICK', 'GITHUB_CLICK', 'LINKEDIN_CLICK', 'RESUME_DOWNLOAD', 'CONTACT_FORM_SUBMIT'] },
        session: this.sessionWhere(r, r.from, r.to),
      },
      select: { sessionId: true, type: true, path: true, projectSlug: true, target: true },
      orderBy: [{ sessionId: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      take: 100_000,
    })
    const step = (e: (typeof events)[number]) => {
      switch (e.type) {
        case 'PAGE_VIEW': return e.path
        case 'PROJECT_VIEW': return `project:${e.projectSlug ?? '?'}`
        case 'PROJECT_CLICK': return e.target || 'link'
        case 'GITHUB_CLICK': return 'github'
        case 'LINKEDIN_CLICK': return 'linkedin'
        case 'RESUME_DOWNLOAD': return 'resume'
        default: return 'contact'
      }
    }
    const perSession = new Map<string, string[]>()
    for (const e of events) {
      const steps = perSession.get(e.sessionId) ?? []
      const s = step(e)
      if (steps.length < 5 && !steps.includes(s)) steps.push(s)
      perSession.set(e.sessionId, steps)
    }
    const counts = new Map<string, number>()
    for (const steps of perSession.values()) {
      const k = JSON.stringify(steps)
      counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([k, sessions]) => ({ steps: JSON.parse(k) as string[], sessions }))
  }

  private sessionView<T extends { id: string; visitorId: string | null }>({ visitorId, ...s }: T) {
    return { ...s, visitor: visitorHash(visitorId) }
  }

  async sessions(q: z.infer<typeof pageQuerySchema>) {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.analyticsSession.findMany({ orderBy: { startedAt: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
      this.prisma.analyticsSession.count(),
    ])
    return { items: rows.map((s) => this.sessionView(s)), total }
  }

  async session(id: string) {
    const s = await this.prisma.analyticsSession.findUnique({
      where: { id },
      include: {
        events: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: { id: true, type: true, path: true, projectSlug: true, section: true, target: true, value: true, createdAt: true },
        },
      },
    })
    if (!s) throw new NotFoundException('Session not found')
    return this.sessionView(s)
  }

  async live() {
    const windowMinutes = (await this.settings.get()).analytics.liveWindowMinutes
    const rows = await this.prisma.analyticsSession.findMany({
      where: { lastSeenAt: { gte: new Date(Date.now() - windowMinutes * 60_000) } },
      orderBy: { lastSeenAt: 'desc' },
      take: 200,
      select: { id: true, currentPath: true, lastSeenAt: true, device: true, referrerDomain: true },
    })
    return {
      windowMinutes,
      sessions: rows.map((s) => ({ ...s, id: s.id.slice(0, 8) })),
      note: 'Approximate — ad blockers, consent choices and network conditions hide some visitors.',
    }
  }
}
