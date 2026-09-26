import { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'
import request from 'supertest'
import { PrismaService } from '../src/prisma/prisma.service'
import { SettingsService } from '../src/settings/settings.service'
import { auth, createApp, createUser, login, resetDb } from './helpers'

const CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

describe('Analytics', () => {
  let app: INestApplication
  let prisma: PrismaClient
  let analyst: string
  let editor: string
  const http = () => request(app.getHttpServer())
  const send = (body: unknown, ua = CHROME) => http().post('/api/analytics/events').set('User-Agent', ua).send(body as object)
  const batch = (over: Record<string, unknown> = {}) => ({
    sessionId: randomUUID(),
    events: [{ type: 'PAGE_VIEW', path: '/' }],
    ...over,
  })

  beforeAll(async () => {
    app = await createApp()
    prisma = app.get(PrismaService)
  })
  beforeEach(async () => {
    await resetDb(prisma)
    await createUser(prisma, 'ANALYST', 'an@test.dev')
    await createUser(prisma, 'EDITOR', 'e@test.dev')
    analyst = (await login(app, 'an@test.dev')).token
    editor = (await login(app, 'e@test.dev')).token
  })
  afterAll(() => app.close())

  it('creates a session and events, keeping only the referrer domain and no IP or user agent', async () => {
    const b = batch({
      referrer: 'https://www.google.com/search?q=krishna+portfolio',
      events: [
        { type: 'PAGE_VIEW', path: '/' },
        { type: 'SECTION_VIEW', path: '/', section: 'projects', value: 12 },
        { type: 'HEARTBEAT', path: '/', value: 15 },
        { type: 'PROJECT_VIEW', path: '/projects/demo', projectSlug: 'demo' },
      ],
    })
    await send(b).set('X-Forwarded-For', '203.0.113.9').set('CF-IPCountry', 'de').expect(204)
    const s = await prisma.analyticsSession.findUniqueOrThrow({ where: { id: b.sessionId }, include: { events: true } })
    expect(s).toMatchObject({
      referrerDomain: 'google.com',
      source: 'search',
      landingPath: '/',
      currentPath: '/projects/demo',
      device: 'desktop',
      browser: 'Chrome',
      country: 'DE',
      pageViews: 1,
      eventCount: 3,
      engagedSec: 27,
      visitorId: null,
    })
    expect(s.events.map((e) => e.type).sort()).toEqual(['PAGE_VIEW', 'PROJECT_VIEW', 'SECTION_VIEW']) // heartbeats only feed counters
    const dump = JSON.stringify(s)
    expect(dump).not.toMatch(/203\.0\.113|127\.0\.0\.1|::1|Mozilla|search\?q|krishna\+portfolio/)
    expect(Object.keys(s).filter((k) => /ip|agent/i.test(k))).toEqual([])
  })

  it('updates counters on later batches and caps engaged time per batch', async () => {
    const id = randomUUID()
    await send({ sessionId: id, events: [{ type: 'PAGE_VIEW', path: '/' }] }).expect(204)
    await send({ sessionId: id, events: [{ type: 'PAGE_VIEW', path: '/about' }, { type: 'HEARTBEAT', path: '/about', value: 5000 }] }).expect(204)
    const s = await prisma.analyticsSession.findUniqueOrThrow({ where: { id } })
    expect(s).toMatchObject({ pageViews: 2, eventCount: 2, engagedSec: 300, landingPath: '/', currentPath: '/about' })
  })

  it('accepts text/plain beacons', async () => {
    const b = batch({ referrer: 'https://t.co/abc' })
    await http().post('/api/analytics/events').set('User-Agent', IPHONE).set('Content-Type', 'text/plain;charset=UTF-8').send(JSON.stringify(b)).expect(204)
    const s = await prisma.analyticsSession.findUniqueOrThrow({ where: { id: b.sessionId } })
    expect(s).toMatchObject({ source: 'social', referrerDomain: 't.co', device: 'mobile' })
    await http().post('/api/analytics/events').set('Content-Type', 'text/plain').send('{not json').expect(400)
  })

  it('drops bots and Do Not Track / GPC requests but still answers 204', async () => {
    await send(batch(), 'Googlebot/2.1 (+http://www.google.com/bot.html)').expect(204)
    await send(batch()).set('DNT', '1').expect(204)
    await send(batch()).set('Sec-GPC', '1').expect(204)
    expect(await prisma.analyticsSession.count()).toBe(0)
    expect(await prisma.analyticsEvent.count()).toBe(0)
  })

  it('rejects invalid payloads', async () => {
    await send({ sessionId: 'nope', events: [] }).expect(400)
    await send(batch({ events: [{ type: 'PAGE_VIEW', path: 'https://evil.test/' }] })).expect(400)
    await send(batch({ events: [{ type: 'FORM_CONTENT', path: '/' }] })).expect(400)
  })

  it('classifies campaigns, internal and unknown referrers', async () => {
    const a = batch({ utm: { source: 'newsletter', campaign: 'launch' }, referrer: 'https://mail.example.com/x' })
    const b = batch({ referrer: 'http://site.test/projects' })
    const c = batch({ referrer: 'https://blog.example.org/post/1?ref=me' })
    for (const x of [a, b, c]) await send(x).expect(204)
    const get = (id: string) => prisma.analyticsSession.findUniqueOrThrow({ where: { id } })
    expect(await get(a.sessionId)).toMatchObject({ source: 'campaign', utmCampaign: 'launch', referrerDomain: 'mail.example.com' })
    expect(await get(b.sessionId)).toMatchObject({ source: 'internal', referrerDomain: null })
    expect(await get(c.sessionId)).toMatchObject({ source: 'referral', referrerDomain: 'blog.example.org' })
  })

  it('distinguishes new and returning consenting visitors', async () => {
    const visitorId = randomUUID()
    const first = batch({ visitorId })
    await send(first).expect(204)
    const second = batch({ visitorId })
    await send(second).expect(204)
    expect((await prisma.analyticsSession.findUniqueOrThrow({ where: { id: first.sessionId } })).isNewVisitor).toBe(true)
    expect((await prisma.analyticsSession.findUniqueOrThrow({ where: { id: second.sessionId } })).isNewVisitor).toBe(false)
    expect(await prisma.analyticsVisitor.count()).toBe(1)
  })

  it('reports zeros on an empty database', async () => {
    const res = await http().get('/api/admin/analytics/overview?preset=7d').set(auth(analyst)).expect(200)
    for (const card of Object.values(res.body.cards)) expect(card).toEqual({ value: 0, previous: 0 })
    expect(res.body.range.bucket).toBe('day')
    expect(res.body.series.length).toBeGreaterThanOrEqual(7)
    expect(res.body.series.every((p: { sessions: number; pageViews: number }) => p.sessions === 0 && p.pageViews === 0)).toBe(true)
    expect(res.body.devices).toEqual([])
    expect(res.body.clicks).toEqual({ github: 0, linkedin: 0, resume: 0, cta: 0 })
    expect(res.body.definitions.engagementRate).toMatch(/10 seconds/)
    const today = await http().get('/api/admin/analytics/overview?preset=today').set(auth(analyst)).expect(200)
    expect(today.body.range.bucket).toBe('hour')
  })

  it('counts events in the overview and compares with the previous period', async () => {
    await send(batch({ events: [{ type: 'PAGE_VIEW', path: '/' }, { type: 'PAGE_VIEW', path: '/about' }, { type: 'GITHUB_CLICK', path: '/about', target: 'github' }] })).expect(204)
    await send(batch({ referrer: 'https://www.linkedin.com/feed/', events: [{ type: 'PAGE_VIEW', path: '/' }, { type: 'PROJECT_VIEW', path: '/', projectSlug: 'demo' }, { type: 'CONTACT_FORM_SUBMIT', path: '/' }] }), IPHONE).expect(204)
    // A session from the previous 7-day window.
    const old = batch()
    await send(old).expect(204)
    const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000)
    await prisma.analyticsSession.update({ where: { id: old.sessionId }, data: { startedAt: tenDaysAgo } })
    await prisma.analyticsEvent.updateMany({ where: { sessionId: old.sessionId }, data: { createdAt: tenDaysAgo } })

    const res = await http().get('/api/admin/analytics/overview?preset=7d').set(auth(analyst)).expect(200)
    const c = res.body.cards
    expect(c.sessions).toEqual({ value: 2, previous: 1 })
    expect(c.pageViews).toEqual({ value: 3, previous: 1 })
    expect(c.projectViews).toEqual({ value: 1, previous: 0 })
    expect(c.contactSubmissions).toEqual({ value: 1, previous: 0 })
    expect(c.uniqueVisitors.value).toBe(2)
    expect(c.engagementRate.value).toBe(1) // both sessions converted or viewed 2 pages
    expect(c.engagementRate.previous).toBe(0)
    expect(res.body.clicks.github).toBe(1)
    expect(res.body.topPages[0]).toEqual({ key: '/', count: 2 })
    expect(res.body.topProjects).toEqual([{ key: 'demo', count: 1 }])
    expect(res.body.sources).toEqual(expect.arrayContaining([{ key: 'direct', count: 1 }, { key: 'social', count: 1 }]))
    expect(res.body.referrers).toEqual([{ key: 'linkedin.com', count: 1 }])
    const series = res.body.series as { sessions: number; pageViews: number; submissions: number }[]
    expect(series.reduce((n, p) => n + p.sessions, 0)).toBe(2)
    expect(series.reduce((n, p) => n + p.pageViews, 0)).toBe(3)
    expect(series.reduce((n, p) => n + p.submissions, 0)).toBe(1)

    const social = await http().get('/api/admin/analytics/overview?preset=7d&source=social').set(auth(analyst)).expect(200)
    expect(social.body.cards.sessions.value).toBe(1)
    const byPath = await http().get('/api/admin/analytics/overview?preset=7d&path=/about').set(auth(analyst)).expect(200)
    expect(byPath.body.cards.sessions.value).toBe(1)
    expect(byPath.body.cards.pageViews.value).toBe(1)
  })

  it('reports projects, sources and journeys without inventing numbers', async () => {
    await prisma.project.create({ data: { slug: 'demo', title: 'Demo App', draft: {} } })
    await prisma.project.create({ data: { slug: 'quiet', title: 'Quiet', draft: {} } })
    await send(batch({ events: [
      { type: 'PAGE_VIEW', path: '/' },
      { type: 'PROJECT_VIEW', path: '/', projectSlug: 'demo' },
      { type: 'PROJECT_CLICK', path: '/', projectSlug: 'demo', target: 'demo' },
      { type: 'PROJECT_CLICK', path: '/', projectSlug: 'demo', target: 'repo' },
    ] })).expect(204)
    await send(batch({ events: [{ type: 'PAGE_VIEW', path: '/' }, { type: 'PROJECT_VIEW', path: '/', projectSlug: 'demo' }] })).expect(204)

    const p = await http().get('/api/admin/analytics/projects').set(auth(analyst)).expect(200)
    const demo = p.body.items.find((x: { slug: string }) => x.slug === 'demo')
    expect(demo).toMatchObject({ title: 'Demo App', views: 2, uniqueSessions: 2, demoClicks: 1, githubClicks: 1, ctr: 1, sources: [{ key: 'direct', count: 2 }] })
    expect(p.body.items.find((x: { slug: string }) => x.slug === 'quiet')).toMatchObject({ views: 0, ctr: null, avgEngagementSec: null })

    const s = await http().get('/api/admin/analytics/sources').set(auth(analyst)).expect(200)
    expect(s.body.sources).toEqual([{ key: 'direct', count: 2 }])

    const j = await http().get('/api/admin/analytics/journeys').set(auth(analyst)).expect(200)
    expect(j.body).toEqual(expect.arrayContaining([{ steps: ['/', 'project:demo', 'demo', 'repo'], sessions: 1 }, { steps: ['/', 'project:demo'], sessions: 1 }]))
  })

  it('separates report and session permissions', async () => {
    await http().get('/api/admin/analytics/overview').set(auth(editor)).expect(403)
    await http().get('/api/admin/analytics/overview').expect(401)
    await http().get('/api/admin/analytics/sessions').set(auth(editor)).expect(403)

    const visitorId = randomUUID()
    const b = batch({ visitorId })
    await send(b).expect(204)
    const list = await http().get('/api/admin/analytics/sessions').set(auth(analyst)).expect(200)
    expect(list.body.total).toBe(1)
    expect(list.body.items[0].visitor).toMatch(/^[a-f0-9]{8}$/)
    expect(JSON.stringify(list.body)).not.toContain(visitorId)
    const detail = await http().get(`/api/admin/analytics/sessions/${b.sessionId}`).set(auth(analyst)).expect(200)
    expect(detail.body.events).toHaveLength(1)
    const live = await http().get('/api/admin/analytics/live').set(auth(analyst)).expect(200)
    expect(live.body).toMatchObject({ windowMinutes: 5, sessions: [{ id: b.sessionId.slice(0, 8), currentPath: '/' }] })
    expect(live.body.note).toMatch(/Approximate/)
  })

  it('ignores events when analytics is disabled in settings', async () => {
    await prisma.siteDocument.create({ data: { key: 'SETTINGS', draft: { analytics: { enabled: false } } } })
    ;(app.get(SettingsService) as unknown as { cache: unknown }).cache = null
    await send(batch()).expect(204)
    expect(await prisma.analyticsSession.count()).toBe(0)
  })
})
