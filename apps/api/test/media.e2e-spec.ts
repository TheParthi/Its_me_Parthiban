import { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { existsSync } from 'fs'
import { join } from 'path'
import sharp from 'sharp'
import request from 'supertest'
import { PrismaService } from '../src/prisma/prisma.service'
import { auth, createApp, createUser, login, resetDb } from './helpers'

const image = (w: number, h: number, format: 'jpeg' | 'png') =>
  sharp({ create: { width: w, height: h, channels: 3, background: '#3366ff' } })[format]().toBuffer()

describe('Media library', () => {
  let app: INestApplication
  let prisma: PrismaClient
  let editor: string
  let admin: string
  const http = () => request(app.getHttpServer())
  const onDisk = (key: string) => existsSync(join(process.env.LOCAL_UPLOAD_DIR!, key))
  const upload = (token: string, buf: Buffer, name: string, fields: Record<string, string> = {}) => {
    const r = http().post('/api/admin/media').set(auth(token))
    for (const [k, v] of Object.entries(fields)) r.field(k, v)
    return r.attach('file', buf, name)
  }

  beforeAll(async () => {
    app = await createApp()
    prisma = app.get(PrismaService)
  })
  beforeEach(async () => {
    await resetDb(prisma)
    await createUser(prisma, 'EDITOR', 'e@test.dev')
    await createUser(prisma, 'ADMIN', 'a@test.dev')
    editor = (await login(app, 'e@test.dev')).token
    admin = (await login(app, 'a@test.dev')).token
  })
  afterAll(() => app.close())

  it('re-encodes a JPEG to WebP, caps its size and stores it on disk', async () => {
    const res = await upload(editor, await image(3000, 1500, 'jpeg'), '../../evil name.jpg', { category: 'PROJECT', alt: 'Cover' }).expect(201)
    expect(res.body).toMatchObject({ mimeType: 'image/webp', width: 2560, height: 1280, category: 'PROJECT', alt: 'Cover', originalName: 'evil name.jpg' })
    expect(res.body.storageKey).toMatch(/^project\/\d{4}\/\d{2}\/[a-z0-9]+\.webp$/)
    expect(res.body.storageKey).not.toContain('evil')
    expect(res.body.url).toBe(`http://api.test/media/${res.body.storageKey}`)
    expect(res.body.checksum).toMatch(/^[a-f0-9]{64}$/)
    expect(onDisk(res.body.storageKey)).toBe(true)
    const meta = await sharp(join(process.env.LOCAL_UPLOAD_DIR!, res.body.storageKey)).metadata()
    expect(meta.format).toBe('webp')
    expect(meta.exif).toBeUndefined()
    expect(await prisma.adminAuditLog.count({ where: { action: 'media.upload' } })).toBe(1)
  })

  it('re-encodes a PNG, ignoring the client MIME type', async () => {
    const res = await http()
      .post('/api/admin/media')
      .set(auth(editor))
      .attach('file', await image(400, 300, 'png'), { filename: 'x.png', contentType: 'application/pdf' })
      .expect(201)
    expect(res.body).toMatchObject({ mimeType: 'image/webp', width: 400, height: 300, category: 'OTHER' })
    expect(onDisk(res.body.storageKey)).toBe(true)
  })

  it('rejects SVG, disguised files and oversize uploads', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
    await upload(editor, svg, 'logo.svg').expect(415)
    await upload(editor, Buffer.from('#!/bin/sh\necho pwned\n'.repeat(10)), 'photo.jpg').expect(415)
    await upload(editor, Buffer.alloc(10 * 1024 * 1024 + 1, 1), 'big.jpg').expect(413)
    await upload(editor, await image(10, 10, 'png'), 'a.png', { alt: '<img onerror=x>' }).expect(400)
    expect(await prisma.mediaAsset.count()).toBe(0)
    expect(await prisma.notification.count({ where: { type: 'upload_failed', permission: 'media:write' } })).toBeGreaterThan(0)
  })

  it('stores PDFs as documents', async () => {
    const pdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n')
    const res = await upload(editor, pdf, 'cv.pdf', { category: 'PROFILE' }).expect(201)
    expect(res.body).toMatchObject({ mimeType: 'application/pdf', category: 'DOCUMENT', width: null })
    const list = await http().get('/api/admin/media?type=document').set(auth(editor)).expect(200)
    expect(list.body.total).toBe(1)
    expect((await http().get('/api/admin/media?type=image').set(auth(editor)).expect(200)).body.total).toBe(0)
  })

  it('enforces media permissions', async () => {
    await createUser(prisma, 'ANALYST', 'an@test.dev')
    const analyst = (await login(app, 'an@test.dev')).token
    await upload(analyst, await image(10, 10, 'png'), 'a.png').expect(403)
    await http().get('/api/admin/media').set(auth(analyst)).expect(403)
    await http().post('/api/admin/media').attach('file', await image(10, 10, 'png'), 'a.png').expect(401)
    const up = await upload(editor, await image(10, 10, 'png'), 'a.png').expect(201)
    await http().delete(`/api/admin/media/${up.body.id}`).set(auth(editor)).expect(403) // no media:delete
  })

  it('lists, filters and edits metadata', async () => {
    await upload(editor, await image(10, 10, 'png'), 'sunset.png', { alt: 'Beach', category: 'BACKGROUND' }).expect(201)
    const b = await upload(editor, await image(10, 10, 'png'), 'avatar.png', { category: 'PROFILE' }).expect(201)
    expect((await http().get('/api/admin/media?q=sunset').set(auth(editor))).body.total).toBe(1)
    expect((await http().get('/api/admin/media?category=PROFILE').set(auth(editor))).body.items[0].id).toBe(b.body.id)
    const p = await http().patch(`/api/admin/media/${b.body.id}`).set(auth(editor)).send({ alt: 'Me', fileName: 'Portrait' }).expect(200)
    expect(p.body).toMatchObject({ alt: 'Me', fileName: 'Portrait', storageKey: b.body.storageKey })
  })

  it('replaces a file in place and removes the old object', async () => {
    const a = await upload(editor, await image(100, 50, 'png'), 'a.png').expect(201)
    const r = await http().post(`/api/admin/media/${a.body.id}/replace`).set(auth(editor)).attach('file', await image(60, 80, 'jpeg'), 'b.jpg').expect(201)
    expect(r.body).toMatchObject({ id: a.body.id, width: 60, height: 80 })
    expect(r.body.storageKey).not.toBe(a.body.storageKey)
    expect(onDisk(r.body.storageKey)).toBe(true)
    expect(onDisk(a.body.storageKey)).toBe(false)
  })

  it('blocks deleting referenced media and deletes unreferenced media', async () => {
    const used = await upload(editor, await image(10, 10, 'png'), 'used.png').expect(201)
    const free = await upload(editor, await image(10, 10, 'png'), 'free.png').expect(201)
    const project = await prisma.project.create({ data: { slug: 'demo', title: 'Demo project', draft: { title: 'Demo project', coverId: used.body.id } } })
    const usage = await http().get(`/api/admin/media/${used.body.id}/usage`).set(auth(editor)).expect(200)
    expect(usage.body).toEqual([{ type: 'project', id: project.id, title: 'Demo project', published: false }])
    const blocked = await http().delete(`/api/admin/media/${used.body.id}`).set(auth(admin)).expect(409)
    expect(blocked.body.usage).toHaveLength(1)
    expect(onDisk(used.body.storageKey)).toBe(true)

    await http().delete(`/api/admin/media/${free.body.id}`).set(auth(admin)).expect(200)
    expect(onDisk(free.body.storageKey)).toBe(false)
    expect(await prisma.mediaAsset.findUnique({ where: { id: free.body.id } })).toBeNull()
    expect(await prisma.adminAuditLog.count({ where: { action: 'media.delete' } })).toBe(1)
  })

  it('finds references in published site documents', async () => {
    const m = await upload(editor, await image(10, 10, 'png'), 'og.png').expect(201)
    await prisma.siteDocument.create({ data: { key: 'SEO', draft: { ogImageId: null }, published: { ogImageId: m.body.id } } })
    const usage = await http().get(`/api/admin/media/${m.body.id}/usage`).set(auth(editor)).expect(200)
    expect(usage.body).toEqual([{ type: 'document', id: 'seo', title: 'Seo', published: true }])
  })
})
