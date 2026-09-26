import { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { PrismaService } from '../src/prisma/prisma.service'
import { SettingsService } from '../src/settings/settings.service'
import { auth, createApp, createUser, login, resetDb } from './helpers'

const valid = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  subject: 'Internship opportunity',
  message: 'Hello! I would love to talk about a role on our team.',
  elapsedMs: 12_000,
}

describe('Contact messages', () => {
  let app: INestApplication
  let prisma: PrismaClient
  let admin: string
  const http = () => request(app.getHttpServer())
  const submit = (body: object) => http().post('/api/public/contact').send(body)

  beforeAll(async () => {
    app = await createApp()
    prisma = app.get(PrismaService)
  })
  beforeEach(async () => {
    await resetDb(prisma)
    ;(app.get(SettingsService) as unknown as { cache: unknown }).cache = null
    await createUser(prisma, 'ADMIN', 'a@test.dev')
    admin = (await login(app, 'a@test.dev')).token
  })
  afterAll(() => app.close())

  it('stores a valid message as NEW and notifies without the message body', async () => {
    const res = await submit(valid).expect(201)
    expect(res.body).toEqual({ ok: true })
    const m = await prisma.contactMessage.findFirstOrThrow()
    expect(m).toMatchObject({ name: valid.name, email: valid.email, subject: valid.subject, message: valid.message, status: 'NEW' })
    const n = await prisma.notification.findFirstOrThrow({ where: { type: 'message' } })
    expect(n).toMatchObject({ title: 'New contact message', body: valid.subject, permission: 'messages:read' })
    expect(JSON.stringify(n)).not.toMatch(/ada@example\.com|love to talk/)
    expect(await prisma.adminAuditLog.count()).toBe(1) // only the admin login
    expect(await prisma.analyticsEvent.count()).toBe(0)
  })

  it('quietly marks honeypot, instant and link-stuffed submissions as spam', async () => {
    await submit({ ...valid, website: 'http://spam.test' }).expect(201).expect({ ok: true })
    await submit({ ...valid, elapsedMs: 400 }).expect(201).expect({ ok: true })
    await submit({ ...valid, message: Array.from({ length: 6 }, (_, i) => `https://x${i}.test`).join(' ') }).expect(201)
    expect(await prisma.contactMessage.count({ where: { status: 'SPAM' } })).toBe(3)
    expect(await prisma.notification.count()).toBe(0)
  })

  it('validates input and respects the enabled setting', async () => {
    await submit({ ...valid, email: 'not-an-email' }).expect(400)
    await submit({ ...valid, message: 'short' }).expect(400)
    await prisma.siteDocument.create({ data: { key: 'SETTINGS', draft: { contact: { enabled: false } } } })
    ;(app.get(SettingsService) as unknown as { cache: unknown }).cache = null
    await submit(valid).expect(503)
    expect(await prisma.contactMessage.count()).toBe(0)
  })

  it('requires authentication and permissions for the inbox', async () => {
    await http().get('/api/admin/messages').expect(401)
    await createUser(prisma, 'EDITOR', 'e@test.dev')
    const editor = (await login(app, 'e@test.dev')).token
    await http().get('/api/admin/messages').set(auth(editor)).expect(403)
  })

  it('lists with counts, marks read on open, updates status and deletes with audit', async () => {
    await submit(valid).expect(201)
    await submit({ ...valid, subject: 'Something else', elapsedMs: 10 }).expect(201)
    const list = await http().get('/api/admin/messages').set(auth(admin)).expect(200)
    expect(list.body.total).toBe(2)
    expect(list.body.counts).toEqual({ NEW: 1, READ: 0, REPLIED: 0, ARCHIVED: 0, SPAM: 1 })
    const newOnly = await http().get('/api/admin/messages?status=NEW&q=internship').set(auth(admin)).expect(200)
    expect(newOnly.body.items).toHaveLength(1)
    const id = newOnly.body.items[0].id

    expect((await http().get(`/api/admin/messages/${id}`).set(auth(admin)).expect(200)).body.status).toBe('READ')
    await http().patch(`/api/admin/messages/${id}`).set(auth(admin)).send({ status: 'BOGUS' }).expect(400)
    expect((await http().patch(`/api/admin/messages/${id}`).set(auth(admin)).send({ status: 'REPLIED' }).expect(200)).body.status).toBe('REPLIED')
    await http().delete(`/api/admin/messages/${id}`).set(auth(admin)).expect(200)
    await http().get(`/api/admin/messages/${id}`).set(auth(admin)).expect(404)

    const audits = await prisma.adminAuditLog.findMany({ where: { action: { startsWith: 'message.' } } })
    expect(audits.map((a) => a.action).sort()).toEqual(['message.delete', 'message.status'])
    expect(JSON.stringify(audits)).not.toMatch(/love to talk|ada@example/)
  })

  it('exports CSV safely', async () => {
    await submit({ ...valid, name: '=HYPERLINK("http://evil")', subject: '@SUM(A1)', message: '+cmd|" /C calc"!A0 and "quotes", commas' }).expect(201)
    const [m] = await prisma.contactMessage.findMany()
    const res = await http().post('/api/admin/messages/export').set(auth(admin)).send({ ids: [m.id] }).expect(200)
    expect(res.headers['content-type']).toMatch(/text\/csv/)
    expect(res.headers['content-disposition']).toMatch(/attachment/)
    const csv = res.text
    expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`)
    expect(csv).toContain(`"'@SUM(A1)"`)
    expect(csv).toContain(`"'+cmd|"" /C calc""!A0 and ""quotes"", commas"`)
    expect(csv).not.toMatch(/,=|,@|,\+/)
    const audit = await prisma.adminAuditLog.findFirstOrThrow({ where: { action: 'message.export' } })
    expect(JSON.stringify(audit.metadata)).not.toMatch(/HYPERLINK|calc/)
    await http().post('/api/admin/messages/export').set(auth(admin)).send({ ids: Array(1001).fill('x') }).expect(400)
  })
})
