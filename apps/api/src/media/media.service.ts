import {
  BadRequestException,
  ConflictException,
  HttpException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common'
import type { Request } from 'express'
import { createHash, randomBytes } from 'crypto'
import { fromBuffer } from 'file-type'
import sharp from 'sharp'
import { z } from 'zod'
import { MediaCategory, Prisma } from '@prisma/client'
import { AuditService } from '../audit/audit.service'
import type { RequestUser } from '../common/decorators'
import { NotificationsService } from '../notifications/notifications.service'
import { PrismaService } from '../prisma/prisma.service'
import { PublicCacheService } from '../public/public-cache.service'
import { STORAGE, StorageDriver } from './storage'

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
const MAX_EDGE = 2560
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'])

const alt = z.string().trim().max(200).regex(/^[^<>]*$/, 'Alt text cannot contain < or >')
const displayName = z.string().trim().min(1).max(200).regex(/^[^<>/\\\u0000-\u001f]*$/, 'Invalid file name')

export const mediaUploadSchema = z.object({
  category: z.enum(MediaCategory).optional(),
  alt: alt.optional().default(''),
})
export const mediaUpdateSchema = z.object({ alt: alt.optional(), fileName: displayName.optional(), category: z.enum(MediaCategory).optional() })
export const mediaListSchema = z.object({
  q: z.string().trim().max(200).optional(),
  category: z.enum(MediaCategory).optional(),
  type: z.enum(['image', 'document']).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
})

interface Processed {
  body: Buffer
  mimeType: string
  ext: string
  width: number | null
  height: number | null
  isDocument: boolean
}

export interface MediaUsage {
  type: string
  id: string
  title: string
  published: boolean
}

/** Client file names are display-only: strip paths and control characters. */
function cleanName(name: string) {
  const base = (name.split(/[\\/]/).pop() ?? '').replace(/[\u0000-\u001f<>]/g, '').trim()
  return base.slice(0, 200) || 'file'
}
const withExt = (name: string, ext: string) => `${name.replace(/\.[^.]*$/, '').slice(0, 190) || 'file'}.${ext}`

/** True when `id` appears as a string value anywhere in the JSON. */
function mentions(value: unknown, id: string): boolean {
  if (value === id) return true
  if (Array.isArray(value)) return value.some((v) => mentions(v, id))
  if (value && typeof value === 'object') return Object.values(value).some((v) => mentions(v, id))
  return false
}

@Injectable()
export class MediaService {
  private readonly log = new Logger('Media')
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly cache: PublicCacheService,
    @Inject(STORAGE) private readonly storage: StorageDriver,
  ) {}

  /** Sniffs magic bytes (the client MIME type is ignored) and re-encodes images. */
  async process(buf: Buffer): Promise<Processed> {
    const detected = await fromBuffer(buf)
    if (detected?.mime === 'application/pdf') {
      return { body: buf, mimeType: 'application/pdf', ext: 'pdf', width: null, height: null, isDocument: true }
    }
    if (!detected || !IMAGE_TYPES.has(detected.mime)) {
      throw new UnsupportedMediaTypeException('Only JPEG, PNG, WebP, AVIF, GIF images and PDF documents are allowed')
    }
    try {
      if (detected.mime === 'image/gif') {
        // Kept byte-for-byte so animation survives; GIF carries no EXIF.
        const m = await sharp(buf, { animated: true }).metadata()
        return { body: buf, mimeType: 'image/gif', ext: 'gif', width: m.width ?? null, height: m.pageHeight ?? m.height ?? null, isDocument: false }
      }
      // rotate() applies EXIF orientation; sharp drops all metadata on output by default.
      const { data, info } = await sharp(buf, { limitInputPixels: 100_000_000 })
        .rotate()
        .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer({ resolveWithObject: true })
      return { body: data, mimeType: 'image/webp', ext: 'webp', width: info.width, height: info.height, isDocument: false }
    } catch {
      throw new UnsupportedMediaTypeException('The image could not be decoded')
    }
  }

  private newKey(category: MediaCategory, ext: string) {
    const now = new Date()
    const id = `c${Date.now().toString(36)}${randomBytes(10).toString('hex')}`
    return `${category.toLowerCase()}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${id}.${ext}`
  }

  private categoryFor(p: Processed, requested?: MediaCategory) {
    if (p.isDocument) return MediaCategory.DOCUMENT
    return !requested || requested === MediaCategory.DOCUMENT ? MediaCategory.OTHER : requested
  }

  private async uploadFailed(originalName: string, err: unknown) {
    const reason = err instanceof HttpException ? err.message : 'Processing or storage error'
    if (!(err instanceof HttpException)) this.log.error(`Upload failed: ${(err as Error).message}`)
    await this.notifications
      .create({ type: 'upload_failed', title: 'Upload failed', body: `${cleanName(originalName).slice(0, 80)}: ${reason}`, link: '/media', permission: 'media:write' })
      .catch(() => undefined)
  }

  async upload(u: RequestUser, file: Express.Multer.File | undefined, fields: z.infer<typeof mediaUploadSchema>, req: Request) {
    if (!file) throw new BadRequestException('A file is required (multipart field "file")')
    let key: string | null = null
    try {
      const p = await this.process(file.buffer)
      const category = this.categoryFor(p, fields.category)
      key = this.newKey(category, p.ext)
      await this.storage.put(key, p.body, p.mimeType)
      const originalName = cleanName(file.originalname)
      const asset = await this.prisma.mediaAsset.create({
        data: {
          storageKey: key,
          url: this.storage.url(key),
          fileName: withExt(originalName, p.ext),
          originalName,
          mimeType: p.mimeType,
          size: p.body.length,
          width: p.width,
          height: p.height,
          alt: fields.alt,
          category,
          checksum: createHash('sha256').update(p.body).digest('hex'),
          uploadedById: u.id,
        },
      })
      await this.audit.record({ action: 'media.upload', actor: u, resourceType: 'media', resourceId: asset.id, metadata: { mimeType: asset.mimeType, size: asset.size, category }, req })
      return asset
    } catch (err) {
      if (key) await this.storage.delete(key).catch(() => undefined)
      await this.uploadFailed(file.originalname, err)
      throw err
    }
  }

  async list(q: z.infer<typeof mediaListSchema>) {
    const where: Prisma.MediaAssetWhereInput = {
      ...(q.category ? { category: q.category } : {}),
      ...(q.type === 'image' ? { mimeType: { startsWith: 'image/' } } : q.type === 'document' ? { mimeType: 'application/pdf' } : {}),
      ...(q.from || q.to ? { createdAt: { ...(q.from ? { gte: new Date(q.from) } : {}), ...(q.to ? { lte: new Date(q.to) } : {}) } } : {}),
      ...(q.q
        ? {
            OR: (['fileName', 'originalName', 'alt'] as const).map((f) => ({ [f]: { contains: q.q, mode: 'insensitive' as const } })),
          }
        : {}),
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.mediaAsset.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
      this.prisma.mediaAsset.count({ where }),
    ])
    return { items, total }
  }

  private async get(id: string) {
    const a = await this.prisma.mediaAsset.findUnique({ where: { id } })
    if (!a) throw new NotFoundException('Media not found')
    return a
  }

  async update(u: RequestUser, id: string, b: z.infer<typeof mediaUpdateSchema>, req: Request) {
    await this.get(id)
    const asset = await this.prisma.mediaAsset.update({ where: { id }, data: b })
    this.cache.invalidate()
    await this.audit.record({ action: 'media.update', actor: u, resourceType: 'media', resourceId: id, metadata: { fields: Object.keys(b) }, req })
    return asset
  }

  /** New bytes under a new key; the id (and every content reference) stays the same. */
  async replace(u: RequestUser, id: string, file: Express.Multer.File | undefined, req: Request) {
    if (!file) throw new BadRequestException('A file is required (multipart field "file")')
    const old = await this.get(id)
    let key: string | null = null
    try {
      const p = await this.process(file.buffer)
      const category = p.isDocument ? MediaCategory.DOCUMENT : old.category === MediaCategory.DOCUMENT ? MediaCategory.OTHER : old.category
      key = this.newKey(category, p.ext)
      await this.storage.put(key, p.body, p.mimeType)
      const originalName = cleanName(file.originalname)
      const asset = await this.prisma.mediaAsset.update({
        where: { id },
        data: {
          storageKey: key,
          url: this.storage.url(key),
          fileName: withExt(old.fileName, p.ext),
          originalName,
          mimeType: p.mimeType,
          size: p.body.length,
          width: p.width,
          height: p.height,
          category,
          checksum: createHash('sha256').update(p.body).digest('hex'),
        },
      })
      key = null
      await this.storage.delete(old.storageKey).catch((e) => this.log.warn(`Could not delete replaced object ${old.storageKey}: ${(e as Error).message}`))
      this.cache.invalidate()
      await this.audit.record({ action: 'media.replace', actor: u, resourceType: 'media', resourceId: id, metadata: { mimeType: asset.mimeType, size: asset.size }, req })
      return asset
    } catch (err) {
      if (key) await this.storage.delete(key).catch(() => undefined)
      await this.uploadFailed(file.originalname, err)
      throw err
    }
  }

  /** Every draft or published record that references the asset. */
  async usage(id: string): Promise<MediaUsage[]> {
    await this.get(id)
    const out: MediaUsage[] = []
    const check = (type: string, rowId: string, title: string, draft: unknown, published: unknown) => {
      const pub = mentions(published, id)
      if (pub || mentions(draft, id)) out.push({ type, id: rowId, title, published: pub })
    }
    const sel = { id: true, draft: true, published: true } as const
    const [docs, projects, skills, certs, achievements] = await Promise.all([
      this.prisma.siteDocument.findMany({ select: { key: true, draft: true, published: true } }),
      this.prisma.project.findMany({ select: { ...sel, title: true } }),
      this.prisma.skill.findMany({ select: { ...sel, name: true } }),
      this.prisma.certification.findMany({ select: sel }),
      this.prisma.achievement.findMany({ select: sel }),
    ])
    const field = (j: unknown, k: string) => String((j as Record<string, unknown> | null)?.[k] ?? '')
    for (const d of docs) check('document', d.key.toLowerCase(), d.key.charAt(0) + d.key.slice(1).toLowerCase(), d.draft, d.published)
    for (const p of projects) check('project', p.id, p.title, p.draft, p.published)
    for (const s of skills) check('skill', s.id, s.name, s.draft, s.published)
    for (const c of certs) check('certification', c.id, field(c.draft, 'name') || 'Certification', c.draft, c.published)
    for (const a of achievements) check('achievement', a.id, field(a.draft, 'title') || 'Achievement', a.draft, a.published)
    return out
  }

  async remove(u: RequestUser, id: string, req: Request) {
    const asset = await this.get(id)
    const usage = await this.usage(id)
    if (usage.length) throw new ConflictException({ message: 'This file is still used by your content. Remove it there first.', usage })
    await this.prisma.mediaAsset.delete({ where: { id } })
    await this.storage.delete(asset.storageKey).catch((e) => this.log.warn(`Could not delete object ${asset.storageKey}: ${(e as Error).message}`))
    await this.audit.record({ action: 'media.delete', actor: u, resourceType: 'media', resourceId: id, metadata: { fileName: asset.fileName }, req })
    return { ok: true }
  }
}
