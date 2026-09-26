import { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { authenticator } from 'otplib'
import request from 'supertest'
import { PrismaService } from '../src/prisma/prisma.service'
import { PASSWORD, auth, createApp, createUser, login, resetDb } from './helpers'

describe('Authentication and authorisation', () => {
  let app: INestApplication
  let prisma: PrismaClient
  const http = () => request(app.getHttpServer())

  beforeAll(async () => {
    app = await createApp()
    prisma = app.get(PrismaService)
  })
  beforeEach(async () => {
    await resetDb(prisma)
  })
  afterAll(() => app.close())

  it('rejects unauthenticated access to admin endpoints', async () => {
    for (const path of ['/api/auth/me', '/api/admin/users', '/api/admin/audit', '/api/admin/settings', '/api/admin/security/overview']) {
      await http().get(path).expect(401)
    }
  })

  it('rejects forged or malformed tokens', async () => {
    await http().get('/api/auth/me').set('Authorization', 'Bearer not-a-jwt').expect(401)
    const forged =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ4Iiwic2lkIjoieCIsImF1dGhBdCI6MCwiYXVkIjoicGctYWRtaW4iLCJpc3MiOiJwZy1hcGkifQ.bad'
    await http().get('/api/auth/me').set(auth(forged)).expect(401)
  })

  it('logs in, returns the user with permissions, and never leaks the password hash', async () => {
    await createUser(prisma, 'SUPER_ADMIN', 'owner@test.dev')
    const res = await http().post('/api/auth/login').send({ email: 'OWNER@test.dev', password: PASSWORD }).expect(200)
    expect(res.body.status).toBe('ok')
    expect(res.body.user.permissions).toContain('users:write')
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$argon2/)
    const cookie = ([] as string[]).concat(res.headers['set-cookie']).join(';')
    expect(cookie).toMatch(/pg_refresh=/)
    expect(cookie).toMatch(/HttpOnly/)
    expect(cookie).toMatch(/SameSite=Strict/)
    expect(cookie).toMatch(/Path=\/api\/auth/)
    const stored = await prisma.adminSession.findFirstOrThrow()
    const raw = cookie.match(/pg_refresh=([^;]+)/)![1]
    expect(stored.refreshTokenHash).not.toBe(raw) // only the hash is stored
  })

  it('uses the same error for unknown email and wrong password, and audits both', async () => {
    await createUser(prisma, 'ADMIN', 'a@test.dev')
    const a = await http().post('/api/auth/login').send({ email: 'nobody@test.dev', password: 'x' }).expect(401)
    const b = await http().post('/api/auth/login').send({ email: 'a@test.dev', password: 'wrong' }).expect(401)
    expect(a.body.message).toBe(b.body.message)
    expect(await prisma.adminAuditLog.count({ where: { action: 'auth.login', success: false } })).toBe(2)
  })

  it('locks the account after repeated failures', async () => {
    await createUser(prisma, 'ADMIN', 'a@test.dev')
    for (let i = 0; i < 5; i++) await http().post('/api/auth/login').send({ email: 'a@test.dev', password: 'wrong' }).expect(401)
    await http().post('/api/auth/login').send({ email: 'a@test.dev', password: PASSWORD }).expect(429)
    expect(await prisma.notification.count({ where: { type: 'security' } })).toBe(1)
  })

  it('rotates refresh tokens and revokes the family when an old token is reused', async () => {
    await createUser(prisma, 'ADMIN', 'a@test.dev')
    const s = await login(app, 'a@test.dev')
    await http().post('/api/auth/refresh').set('Cookie', s.cookie).expect(403) // missing CSRF header
    const r1 = await http().post('/api/auth/refresh').set('Cookie', s.cookie).set('X-Requested-With', 'pg-admin').expect(200)
    const next = ([] as string[]).concat(r1.headers['set-cookie']).find((c) => c.startsWith('pg_refresh='))!.split(';')[0]
    expect(next).not.toBe(s.cookie)
    // Outside the grace window, replaying the old token is treated as theft.
    await prisma.adminSession.updateMany({ where: { rotatedAt: { not: null } }, data: { rotatedAt: new Date(Date.now() - 60_000) } })
    await http().post('/api/auth/refresh').set('Cookie', s.cookie).set('X-Requested-With', 'pg-admin').expect(401)
    await http().post('/api/auth/refresh').set('Cookie', next).set('X-Requested-With', 'pg-admin').expect(401)
    await http().get('/api/auth/me').set(auth(r1.body.accessToken)).expect(401)
    expect(await prisma.adminAuditLog.count({ where: { action: 'auth.refresh_reuse' } })).toBe(1)
  })

  it('logout revokes the session immediately', async () => {
    await createUser(prisma, 'ADMIN', 'a@test.dev')
    const s = await login(app, 'a@test.dev')
    await http().get('/api/auth/me').set(auth(s.token)).expect(200)
    await http().post('/api/auth/logout').set('Cookie', s.cookie).set('X-Requested-With', 'pg-admin').expect(200)
    await http().get('/api/auth/me').set(auth(s.token)).expect(401)
  })

  it('enforces role permissions at the API', async () => {
    await createUser(prisma, 'EDITOR', 'e@test.dev')
    await createUser(prisma, 'ANALYST', 'an@test.dev')
    const editor = await login(app, 'e@test.dev')
    const analyst = await login(app, 'an@test.dev')
    await http().get('/api/admin/users').set(auth(editor.token)).expect(403)
    await http().get('/api/admin/security/overview').set(auth(editor.token)).expect(403)
    await http().get('/api/admin/audit').set(auth(analyst.token)).expect(403)
    await http().put('/api/admin/settings').set(auth(editor.token)).send({}).expect(403)
  })

  it('requires recent password confirmation for sensitive actions', async () => {
    await createUser(prisma, 'SUPER_ADMIN', 'sa@test.dev')
    const s = await login(app, 'sa@test.dev')
    // Pretend the login happened long ago.
    await prisma.adminSession.updateMany({ data: { authAt: new Date(Date.now() - 3600_000) } })
    const refreshed = await http().post('/api/auth/refresh').set('Cookie', s.cookie).set('X-Requested-With', 'pg-admin').expect(200)
    const t = refreshed.body.accessToken
    const r = await http().post('/api/admin/users').set(auth(t)).send({ email: 'new@test.dev', name: 'New', role: 'EDITOR' }).expect(403)
    expect(r.body.code).toBe('REAUTH_REQUIRED')
    const re = await http().post('/api/auth/reauth').set(auth(t)).send({ password: PASSWORD }).expect(200)
    const created = await http().post('/api/admin/users').set(auth(re.body.accessToken)).send({ email: 'new@test.dev', name: 'New', role: 'EDITOR' }).expect(201)
    expect(created.body.inviteLink).toMatch(/accept-invite\?token=/) // no SMTP in tests
  })

  it('protects the last Super Admin and blocks self-escalation', async () => {
    const sa = await createUser(prisma, 'SUPER_ADMIN', 'sa@test.dev')
    const admin = await createUser(prisma, 'ADMIN', 'ad@test.dev')
    const s = await login(app, 'sa@test.dev')
    await http().patch(`/api/admin/users/${sa.id}`).set(auth(s.token)).send({ role: 'ADMIN' }).expect(403) // self
    await http().delete(`/api/admin/users/${sa.id}`).set(auth(s.token)).expect(403)
    const second = await createUser(prisma, 'SUPER_ADMIN', 'sa2@test.dev')
    await http().patch(`/api/admin/users/${second.id}`).set(auth(s.token)).send({ disabled: true }).expect(200)
    // With sa2 disabled, sa is the last active Super Admin; the admin cannot touch users at all.
    const a = await login(app, 'ad@test.dev')
    await http().patch(`/api/admin/users/${sa.id}`).set(auth(a.token)).send({ disabled: true }).expect(403)
    await http().patch(`/api/admin/users/${admin.id}`).set(auth(a.token)).send({ role: 'SUPER_ADMIN' }).expect(403)
  })

  it('role changes revoke the target user sessions', async () => {
    await createUser(prisma, 'SUPER_ADMIN', 'sa@test.dev')
    const ed = await createUser(prisma, 'EDITOR', 'e@test.dev')
    const s = await login(app, 'sa@test.dev')
    const e = await login(app, 'e@test.dev')
    await http().patch(`/api/admin/users/${ed.id}`).set(auth(s.token)).send({ role: 'ANALYST' }).expect(200)
    await http().get('/api/auth/me').set(auth(e.token)).expect(401)
  })

  it('supports TOTP two-factor sign-in', async () => {
    await createUser(prisma, 'ADMIN', 'a@test.dev')
    const s = await login(app, 'a@test.dev')
    const setup = await http().post('/api/auth/2fa/setup').set(auth(s.token)).expect(200)
    expect(setup.body.qr).toMatch(/^data:image\/png;base64,/)
    const stored = await prisma.adminUser.findUniqueOrThrow({ where: { email: 'a@test.dev' } })
    expect(stored.totpSecretEnc).not.toContain(setup.body.secret) // encrypted at rest
    await http().post('/api/auth/2fa/enable').set(auth(s.token)).send({ code: '000000' }).expect(401)
    await http().post('/api/auth/2fa/enable').set(auth(s.token)).send({ code: authenticator.generate(setup.body.secret) }).expect(200)

    const step1 = await http().post('/api/auth/login').send({ email: 'a@test.dev', password: PASSWORD }).expect(200)
    expect(step1.body.status).toBe('2fa_required')
    expect(step1.headers['set-cookie']).toBeUndefined()
    await http().post('/api/auth/2fa/verify').send({ challengeId: step1.body.challengeId, code: '123456' }).expect(401)
    const ok = await http()
      .post('/api/auth/2fa/verify')
      .send({ challengeId: step1.body.challengeId, code: authenticator.generate(setup.body.secret) })
      .expect(200)
    expect(ok.body.status).toBe('ok')
  })

  it('resets passwords with a single-use token and revokes sessions', async () => {
    const u = await createUser(prisma, 'ADMIN', 'a@test.dev')
    const s = await login(app, 'a@test.dev')
    await http().post('/api/auth/forgot-password').send({ email: 'a@test.dev' }).expect(202)
    await http().post('/api/auth/forgot-password').send({ email: 'ghost@test.dev' }).expect(202) // same response
    const token = 'known-reset-token-for-the-test-1234567890'
    const { sha256 } = await import('../src/common/crypto')
    await prisma.authToken.create({ data: { type: 'PASSWORD_RESET', userId: u.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60_000) } })
    await http().post('/api/auth/reset-password').send({ token, password: 'short' }).expect(400)
    await http().post('/api/auth/reset-password').send({ token, password: 'Brand-new-Passw0rd' }).expect(200)
    await http().post('/api/auth/reset-password').send({ token, password: 'Another-new-Passw0rd' }).expect(401) // single use
    await http().get('/api/auth/me').set(auth(s.token)).expect(401)
    await login(app, 'a@test.dev', 'Brand-new-Passw0rd')
  })

  it('keeps the audit log append-only at the database level', async () => {
    await prisma.adminAuditLog.create({ data: { action: 'test.entry' } })
    await expect(prisma.adminAuditLog.updateMany({ data: { action: 'tampered' } })).rejects.toThrow(/append-only/)
    await expect(prisma.adminAuditLog.deleteMany()).rejects.toThrow(/append-only/)
  })

  it('never writes secrets into audit metadata', async () => {
    await createUser(prisma, 'ADMIN', 'a@test.dev')
    await http().post('/api/auth/login').send({ email: 'a@test.dev', password: 'my-secret-guess' })
    const rows = await prisma.adminAuditLog.findMany()
    expect(JSON.stringify(rows, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))).not.toContain('my-secret-guess')
  })
})
