import { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import { ContentScheduler } from '../src/content/scheduler.service'
import { PublicCacheService } from '../src/public/public-cache.service'
import { PrismaService } from '../src/prisma/prisma.service'
import { homepage, profile, project, publishSite } from './content-fixtures'
import { auth, createApp, createUser, login, resetDb } from './helpers'

describe('Content management and public API', () => {
  let app: INestApplication
  let prisma: PrismaClient
  let admin: string
  const http = () => request(app.getHttpServer())

  beforeAll(async () => {
    app = await createApp()
    prisma = app.get(PrismaService)
  })
  beforeEach(async () => {
    await resetDb(prisma)
    app.get(PublicCacheService).invalidate() // the DB was truncated behind the app's back
    await createUser(prisma, 'SUPER_ADMIN', 'sa@test.dev')
    admin = (await login(app, 'sa@test.dev')).token
  })
  afterAll(() => app.close())

  const createProject = async (slug: string, extra: Record<string, unknown> = {}) =>
    (await http().post('/api/admin/projects').set(auth(admin)).send(project(slug, extra)).expect(201)).body

  it('creates, lists, updates and duplicates projects', async () => {
    const p = await createProject('alpha')
    expect(p).toMatchObject({ slug: 'alpha', status: 'DRAFT', hasUnpublishedChanges: true, technologies: ['TypeScript', 'NestJS'] })
    expect(await prisma.projectTechnology.count({ where: { projectId: p.id } })).toBe(2)

    const upd = await http().patch(`/api/admin/projects/${p.id}`).set(auth(admin)).send({ title: 'Alpha 2', technologies: ['Go'] }).expect(200)
    expect(upd.body).toMatchObject({ title: 'Alpha 2', category: 'Web', technologies: ['Go'] }) // untouched fields kept
    expect((await prisma.projectTechnology.findMany({ where: { projectId: p.id } })).map((t) => t.name)).toEqual(['Go'])

    const dup = await http().post(`/api/admin/projects/${p.id}/duplicate`).set(auth(admin)).expect(201)
    expect(dup.body).toMatchObject({ slug: 'alpha-copy', status: 'DRAFT' })
    const list = await http().get('/api/admin/projects?q=alpha').set(auth(admin)).expect(200)
    expect(list.body.map((x: { slug: string }) => x.slug)).toEqual(['alpha', 'alpha-copy'])
    await http().get('/api/admin/projects/nope').set(auth(admin)).expect(404)
    expect(await prisma.adminAuditLog.count({ where: { action: 'project.create' } })).toBe(1)
  })

  it('rejects duplicate slugs with 409 and invalid input with 400', async () => {
    const a = await createProject('alpha')
    await createProject('beta')
    await http().post('/api/admin/projects').set(auth(admin)).send(project('alpha')).expect(409)
    await http().patch(`/api/admin/projects/${a.id}`).set(auth(admin)).send({ slug: 'beta' }).expect(409)
    const bad = await http().post('/api/admin/projects').set(auth(admin)).send(project('Bad Slug', { repoUrl: 'javascript:alert(1)' })).expect(400)
    expect(bad.body.issues.map((i: { path: string }) => i.path)).toEqual(expect.arrayContaining(['slug', 'repoUrl']))
  })

  it('strips raw HTML from markdown fields on save', async () => {
    const p = await createProject('alpha', {
      description: 'Hello <script>alert(1)</script>**world** <img src=x onerror=alert(1)> & more\n> quote',
      contribution: '<b>bold</b> text',
    })
    expect(p.description).toBe('Hello **world**  & more\n> quote')
    expect(p.contribution).toBe('bold text')
    await http().put('/api/admin/documents/profile').set(auth(admin)).send({ ...profile, longBio: 'Hi <iframe src="x"></iframe>there' }).expect(200)
    const doc = await http().get('/api/admin/documents/profile').set(auth(admin)).expect(200)
    expect(doc.body.draft.longBio).toBe('Hi there')
  })

  it('keeps drafts private until published, and publishing updates the cached bundle', async () => {
    await publishSite(app, admin)
    const p = await createProject('alpha')
    let bundle = await http().get('/api/public/bundle').expect(200)
    expect(bundle.body.projects).toHaveLength(0)
    await http().get('/api/public/projects/alpha').expect(404)
    const etag = bundle.headers.etag
    expect(bundle.headers['cache-control']).toBe('public, max-age=30')
    await http().get('/api/public/bundle').set('If-None-Match', etag).expect(304)

    await http().post(`/api/admin/projects/${p.id}/publish`).set(auth(admin)).expect(200)
    bundle = await http().get('/api/public/bundle').set('If-None-Match', etag).expect(200) // cache invalidated
    expect(bundle.body.projects.map((x: { slug: string }) => x.slug)).toEqual(['alpha'])
    expect(bundle.body.projects[0]).toMatchObject({ cover: null, screenshots: [] })
    expect(bundle.body.profile.fullName).toBe('Ada Lovelace')

    // Editing the draft does not change the public version until republished.
    await http().patch(`/api/admin/projects/${p.id}`).set(auth(admin)).send({ title: 'Changed' }).expect(200)
    const pub = await http().get('/api/public/projects/alpha').expect(200)
    expect(pub.body.title).toBe('Project alpha')
    const adminView = await http().get(`/api/admin/projects/${p.id}`).set(auth(admin)).expect(200)
    expect(adminView.body.hasUnpublishedChanges).toBe(true)
  })

  it.each(['unpublish', 'archive', 'trash'])('%s removes a project from the public API', async (action) => {
    await publishSite(app, admin)
    const p = await createProject('alpha')
    await http().post(`/api/admin/projects/${p.id}/publish`).set(auth(admin)).expect(200)
    await http().get('/api/public/projects/alpha').expect(200)
    if (action === 'trash') await http().delete(`/api/admin/projects/${p.id}`).set(auth(admin)).expect(200)
    else await http().post(`/api/admin/projects/${p.id}/${action}`).set(auth(admin)).expect(200)
    expect((await http().get('/api/public/bundle').expect(200)).body.projects).toHaveLength(0)
    await http().get('/api/public/projects/alpha').expect(404)
    if (action === 'trash') {
      const trash = await http().get('/api/admin/projects?trash=true').set(auth(admin)).expect(200)
      expect(trash.body).toHaveLength(1)
      await http().post(`/api/admin/projects/${p.id}/restore`).set(auth(admin)).expect(200)
      await http().get('/api/public/projects/alpha').expect(200)
      await http().delete(`/api/admin/projects/${p.id}?permanent=true`).set(auth(admin)).expect(200)
      expect(await prisma.project.count()).toBe(0)
    }
  })

  it('serves UNLISTED projects by slug only', async () => {
    await publishSite(app, admin)
    const p = await createProject('hidden', { visibility: 'UNLISTED' })
    await http().post(`/api/admin/projects/${p.id}/publish`).set(auth(admin)).expect(200)
    expect((await http().get('/api/public/projects').expect(200)).body).toHaveLength(0)
    await http().get('/api/public/projects/hidden').expect(200)
    const sitemap = await http().get('/api/public/sitemap.xml').expect(200)
    expect(sitemap.headers['content-type']).toMatch(/application\/xml/)
    expect(sitemap.text).not.toContain('hidden')
  })

  it('schedules publication and the scheduler publishes due projects', async () => {
    await publishSite(app, admin)
    const p = await createProject('later')
    const at = new Date(Date.now() + 3600_000).toISOString()
    const res = await http().post(`/api/admin/projects/${p.id}/publish`).set(auth(admin)).send({ at }).expect(200)
    expect(res.body).toMatchObject({ status: 'DRAFT', publishAt: at })
    await prisma.project.update({ where: { id: p.id }, data: { publishAt: new Date(Date.now() - 1000) } })
    // A broken draft fails and raises a notification instead.
    const broken = await createProject('broken')
    await prisma.project.update({ where: { id: broken.id }, data: { publishAt: new Date(Date.now() - 1000), draft: { title: '' } } })
    await app.get(ContentScheduler).publishDue()
    await http().get('/api/public/projects/later').expect(200)
    expect(await prisma.adminAuditLog.count({ where: { action: 'project.publish_scheduled', actorId: null, success: true } })).toBe(1)
    expect(await prisma.notification.count({ where: { type: 'publish_failed', permission: 'content:publish' } })).toBe(1)
    expect((await prisma.project.findUniqueOrThrow({ where: { id: broken.id } })).publishAt).toBeNull()
  })

  it('refuses to publish an invalid draft with 422', async () => {
    const p = await createProject('alpha')
    await prisma.project.update({ where: { id: p.id }, data: { draft: { ...project('alpha'), title: '' } } })
    const r = await http().post(`/api/admin/projects/${p.id}/publish`).set(auth(admin)).expect(422)
    expect(r.body.issues[0].path).toBe('title')
  })

  it('records version history and restores a snapshot into the draft only', async () => {
    await publishSite(app, admin)
    const p = await createProject('alpha')
    await http().post(`/api/admin/projects/${p.id}/publish`).set(auth(admin)).expect(200)
    await http().patch(`/api/admin/projects/${p.id}`).set(auth(admin)).send({ title: 'Second' }).expect(200)
    await http().post(`/api/admin/projects/${p.id}/publish`).set(auth(admin)).expect(200)

    const versions = await http().get(`/api/admin/versions/project/${p.id}`).set(auth(admin)).expect(200)
    expect(versions.body.map((v: { version: number }) => v.version)).toEqual([2, 1])
    expect(versions.body[0].author.email).toBe('sa@test.dev')
    const v1 = await http().get(`/api/admin/versions/item/${versions.body[1].id}`).set(auth(admin)).expect(200)
    expect(v1.body.snapshot.title).toBe('Project alpha')

    await http().post(`/api/admin/versions/item/${versions.body[1].id}/restore`).set(auth(admin)).expect(200)
    const draft = await http().get(`/api/admin/projects/${p.id}`).set(auth(admin)).expect(200)
    expect(draft.body).toMatchObject({ title: 'Project alpha', hasUnpublishedChanges: true })
    expect((await http().get('/api/public/projects/alpha').expect(200)).body.title).toBe('Second') // still published
    const docVersions = await http().get('/api/admin/versions/profile/profile').set(auth(admin)).expect(200)
    expect(docVersions.body).toHaveLength(1)
  })

  it('enforces permissions: editors write but cannot publish, analysts cannot read', async () => {
    await createUser(prisma, 'EDITOR', 'ed@test.dev')
    await createUser(prisma, 'ANALYST', 'an@test.dev')
    const editor = (await login(app, 'ed@test.dev')).token
    const analyst = (await login(app, 'an@test.dev')).token
    const p = (await http().post('/api/admin/projects').set(auth(editor)).send(project('alpha')).expect(201)).body
    await http().patch(`/api/admin/projects/${p.id}`).set(auth(editor)).send({ title: 'x' }).expect(200)
    await http().post(`/api/admin/projects/${p.id}/publish`).set(auth(editor)).expect(403)
    await http().delete(`/api/admin/projects/${p.id}`).set(auth(editor)).expect(403)
    await http().put('/api/admin/documents/profile').set(auth(editor)).send(profile).expect(200)
    await http().post('/api/admin/documents/profile/publish').set(auth(editor)).expect(403)
    await http().put('/api/admin/documents/homepage').set(auth(editor)).send(homepage).expect(403) // needs site:write
    await http().get('/api/admin/projects').set(auth(analyst)).expect(403)
    await http().get('/api/admin/documents/profile').set(auth(analyst)).expect(403)
    await http().get('/api/admin/experience').set(auth(analyst)).expect(403)
    await http().get('/api/admin/backup/export').set(auth(editor)).expect(403)
  })

  it('rejects unauthenticated admin requests', async () => {
    for (const path of ['/api/admin/projects', '/api/admin/documents/profile', '/api/admin/skills', '/api/admin/experience', '/api/admin/search?q=a', '/api/admin/backup/export']) {
      await http().get(path).expect(401)
    }
    await http().post('/api/admin/preview-token').expect(401)
  })

  it('validates homepage and appearance documents', async () => {
    const dupe = { ...homepage, sections: [...homepage.sections, { type: 'hero', enabled: true }] }
    await http().put('/api/admin/documents/homepage').set(auth(admin)).send(dupe).expect(400)
    const noHero = { ...homepage, sections: homepage.sections.map((s) => (s.type === 'hero' ? { ...s, enabled: false } : s)) }
    await http().put('/api/admin/documents/homepage').set(auth(admin)).send(noHero).expect(400)
    await http().put('/api/admin/documents/homepage').set(auth(admin)).send(homepage).expect(200)

    const a = (await http().get('/api/admin/documents/appearance').set(auth(admin)).expect(200)).body.draft
    for (const accent of ['red', '#fff', 'url(javascript:x)', '#12345G']) {
      await http().put('/api/admin/documents/appearance').set(auth(admin)).send({ ...a, colors: { ...a.colors, accent } }).expect(400)
    }
    await http().put('/api/admin/documents/appearance').set(auth(admin)).send({ ...a, colors: { ...a.colors, accent: '#112233' } }).expect(200)
    const reset = await http().post('/api/admin/documents/appearance/reset').set(auth(admin)).expect(200)
    expect(reset.body.draft.colors.accent).toBe('#8B5CF6')
    await http().get('/api/admin/documents/settings').set(auth(admin)).expect(404)
  })

  it('publishes and discards singleton documents', async () => {
    await http().put('/api/admin/documents/profile').set(auth(admin)).send(profile).expect(200)
    await http().get('/api/public/bundle').expect(503) // nothing published yet
    const pub = await http().post('/api/admin/documents/profile/publish').set(auth(admin)).expect(200)
    expect(pub.body).toMatchObject({ status: 'PUBLISHED', hasUnpublishedChanges: false })
    await http().put('/api/admin/documents/profile').set(auth(admin)).send({ ...profile, title: 'Changed' }).expect(200)
    const d = await http().post('/api/admin/documents/profile/discard').set(auth(admin)).expect(200)
    expect(d.body).toMatchObject({ hasUnpublishedChanges: false })
    expect(d.body.draft.title).toBe('Engineer')
    expect((await http().get('/api/public/profile').expect(200)).body.fullName).toBe('Ada Lovelace')
  })

  it('manages skills and categories', async () => {
    await publishSite(app, admin)
    const cat = (await http().post('/api/admin/skill-categories').set(auth(admin)).send({ name: 'Backend' }).expect(201)).body
    await http().post('/api/admin/skill-categories').set(auth(admin)).send({ name: 'Backend' }).expect(409)
    const s = (await http().post('/api/admin/skills').set(auth(admin)).send({ name: 'NestJS', categoryId: cat.id }).expect(201)).body
    await http().post('/api/admin/skills').set(auth(admin)).send({ name: 'X', categoryId: 'missing' }).expect(400)
    await http().post('/api/admin/skills').set(auth(admin)).send({ name: 'Prisma', categoryId: cat.id }).expect(201)
    expect((await http().get('/api/public/skills').expect(200)).body.skills).toHaveLength(0)
    await http().post(`/api/admin/skills/${s.id}/publish`).set(auth(admin)).expect(200)
    let pub = (await http().get('/api/public/skills').expect(200)).body
    expect(pub.skills).toEqual([expect.objectContaining({ name: 'NestJS', category: 'Backend', icon: null })])
    const all = await http().post('/api/admin/skills/publish-all').set(auth(admin)).expect(200)
    expect(all.body.published).toBe(1)
    pub = (await http().get('/api/public/skills').expect(200)).body
    expect(pub.skills).toHaveLength(2)
    expect(pub.categories).toEqual([{ id: cat.id, name: 'Backend', color: '#8B5CF6' }])
    await http().delete(`/api/admin/skill-categories/${cat.id}`).set(auth(admin)).expect(409)
    await http().post(`/api/admin/skills/${s.id}/unpublish`).set(auth(admin)).expect(200)
    expect((await http().get('/api/public/skills').expect(200)).body.skills).toHaveLength(1)
  })

  it('manages collections through the generic API', async () => {
    await publishSite(app, admin)
    const e = (
      await http()
        .post('/api/admin/experience')
        .set(auth(admin))
        .send({ position: 'Intern', organization: 'Acme', startDate: '2024-01' })
        .expect(201)
    ).body
    expect(e).toMatchObject({ position: 'Intern', status: 'DRAFT', employmentType: 'Internship' })
    await http().patch(`/api/admin/experience/${e.id}`).set(auth(admin)).send({ location: 'Remote' }).expect(200)
    await http().post(`/api/admin/experience/${e.id}/publish`).set(auth(admin)).expect(200)
    expect((await http().get('/api/public/experience').expect(200)).body).toEqual([expect.objectContaining({ position: 'Intern', location: 'Remote' })])
    const list = await http().get('/api/admin/experience').set(auth(admin)).expect(200)
    expect(list.body.total).toBe(1)
    await http().post('/api/admin/achievements').set(auth(admin)).send({ title: 'Won', kind: 'Nope' }).expect(400)
    const c = (await http().post('/api/admin/certifications').set(auth(admin)).send({ name: 'AWS', issuer: 'Amazon' }).expect(201)).body
    await http().post(`/api/admin/certifications/${c.id}/publish`).set(auth(admin)).expect(200)
    expect((await http().get('/api/public/bundle').expect(200)).body.certifications).toEqual([expect.objectContaining({ name: 'AWS', image: null })])
    await http().delete(`/api/admin/experience/${e.id}`).set(auth(admin)).expect(200)
    expect((await http().get('/api/public/experience').expect(200)).body).toHaveLength(0)
  })

  it('previews drafts with a short-lived token', async () => {
    await publishSite(app, admin)
    await createProject('draft-only')
    const t = await http().post('/api/admin/preview-token').set(auth(admin)).expect(201)
    expect(t.body.url).toContain(`preview=${t.body.token}`)
    const stored = await prisma.authToken.findFirstOrThrow({ where: { type: 'PREVIEW' } })
    expect(stored.tokenHash).not.toBe(t.body.token)
    const prev = await http().get(`/api/public/preview?token=${t.body.token}`).expect(200)
    expect(prev.body.projects.map((p: { slug: string }) => p.slug)).toEqual(['draft-only'])
    expect(prev.headers['cache-control']).toBe('no-store')
    expect((await http().get('/api/public/bundle').expect(200)).body.projects).toHaveLength(0)
    await http().get('/api/public/preview?token=wrong-token').expect(401)
    await http().get('/api/public/preview').expect(401)
    await prisma.authToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } })
    await http().get(`/api/public/preview?token=${t.body.token}`).expect(401)
  })

  it('serves public settings, robots.txt and sitemap', async () => {
    await publishSite(app, admin)
    const p = await createProject('alpha')
    await http().post(`/api/admin/projects/${p.id}/publish`).set(auth(admin)).expect(200)
    const s = await http().get('/api/public/settings').expect(200)
    expect(s.body).toMatchObject({ analytics: { enabled: true, requireConsent: true, respectDoNotTrack: true }, contact: { enabled: true } })
    expect(s.body.appearance.colors.accent).toBe('#8B5CF6')
    expect(JSON.stringify(s.body)).not.toMatch(/retentionDays|security/)
    const robots = await http().get('/api/public/robots.txt').expect(200)
    expect(robots.text).toMatch(/Allow: \//)
    expect(robots.text).toMatch(/Sitemap: .*\/api\/public\/sitemap\.xml/)
    const sitemap = await http().get('/api/public/sitemap.xml').expect(200)
    expect(sitemap.text).toContain('<loc>https://ada.example.com/?project=alpha</loc>')
  })

  it('searches only the groups the caller may read', async () => {
    await createProject('searchable')
    await prisma.contactMessage.create({ data: { name: 'Searchable Sam', email: 's@x.dev', subject: 'Hi', message: 'Hello there' } })
    await createUser(prisma, 'EDITOR', 'ed@test.dev')
    const all = await http().get('/api/admin/search?q=SEARCH').set(auth(admin)).expect(200)
    expect(all.body.projects).toHaveLength(1)
    expect(all.body.messages).toHaveLength(1)
    expect(all.body.users).toBeDefined()
    const editor = (await login(app, 'ed@test.dev')).token
    const limited = await http().get('/api/admin/search?q=search').set(auth(editor)).expect(200)
    expect(limited.body.projects).toHaveLength(1)
    expect(limited.body.messages).toBeUndefined()
    expect(limited.body.users).toBeUndefined()
  })

  it('round-trips a backup export and restore', async () => {
    await publishSite(app, admin)
    const p = await createProject('alpha')
    await http().post(`/api/admin/projects/${p.id}/publish`).set(auth(admin)).expect(200)
    const cat = (await http().post('/api/admin/skill-categories').set(auth(admin)).send({ name: 'Backend' }).expect(201)).body
    await http().post('/api/admin/skills').set(auth(admin)).send({ name: 'NestJS', categoryId: cat.id }).expect(201)
    const exp = await http().get('/api/admin/backup/export').set(auth(admin)).expect(200)
    expect(exp.body).toMatchObject({ format: 'pg-portfolio-backup', version: 1 })
    expect(exp.body.documents).toHaveLength(4)
    expect(JSON.stringify(exp.body)).not.toMatch(/passwordHash|refreshTokenHash|sa@test\.dev/)

    // Wipe, then restore.
    await http().delete(`/api/admin/projects/${p.id}?permanent=true`).set(auth(admin)).expect(200)
    await createProject('stray')
    await http().post('/api/admin/backup/restore').set(auth(admin)).send(exp.body).expect(400) // missing confirm
    const bad = structuredClone(exp.body)
    bad.projects[0].draft.accent = 'red'
    await http().post('/api/admin/backup/restore?confirm=RESTORE').set(auth(admin)).send(bad).expect(400)
    expect(await prisma.project.count()).toBe(1) // nothing changed on a failed validation

    const r = await http().post('/api/admin/backup/restore?confirm=RESTORE').set(auth(admin)).send(exp.body).expect(200)
    expect(r.body.counts).toMatchObject({ projects: 1, skills: 1, documents: 4 })
    expect((await prisma.project.findMany()).map((x) => x.slug)).toEqual(['alpha'])
    await http().get('/api/public/projects/alpha').expect(200)
    expect(await prisma.contentVersion.count({ where: { action: 'import' } })).toBe(5) // 4 documents + 1 project
    expect(await prisma.adminAuditLog.count({ where: { action: 'backup.restore' } })).toBe(1)
    const again = await http().get('/api/admin/backup/export').set(auth(admin)).expect(200)
    expect(again.body.projects).toEqual(exp.body.projects)
  })

  it('requires backup:restore and recent auth to restore', async () => {
    await createUser(prisma, 'ADMIN', 'ad@test.dev')
    const a = (await login(app, 'ad@test.dev')).token
    await http().post('/api/admin/backup/restore?confirm=RESTORE').set(auth(a)).send({}).expect(403)
  })
})
