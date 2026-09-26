import { Controller, Get, Header, NotFoundException, Param, Query, Req, Res, UnauthorizedException } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { SkipThrottle, Throttle } from '@nestjs/throttler'
import type { Request, Response } from 'express'
import type { PublicBundle } from '@pg/shared'
import { sha256 } from '../common/crypto'
import { Public } from '../common/decorators'
import { PrismaService } from '../prisma/prisma.service'
import { SettingsService } from '../settings/settings.service'
import { BundleService } from './bundle.service'
import { PublicCacheService } from './public-cache.service'

const CACHE = 'public, max-age=30'
const xml = (s: string) => s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`)

@ApiTags('public')
@Public()
@SkipThrottle()
@Controller('public')
export class PublicController {
  constructor(
    private readonly bundles: BundleService,
    private readonly cache: PublicCacheService,
    private readonly settings: SettingsService,
    private readonly prisma: PrismaService,
  ) {}

  /** Cached published bundle with a content-hash ETag. */
  private async cached() {
    const hit = this.cache.get<PublicBundle>('bundle')
    if (hit) return hit
    const version = this.cache.currentVersion
    const value = await this.bundles.build('published')
    const etag = `"${sha256(JSON.stringify(value)).slice(0, 32)}"`
    // Skip caching if a publish invalidated the cache while we were building.
    if (version === this.cache.currentVersion) this.cache.set('bundle', value, etag)
    return { value, etag }
  }

  private async bundle() {
    return (await this.cached()).value
  }

  @Get('bundle')
  async getBundle(@Req() req: Request, @Res() res: Response) {
    const { value, etag } = await this.cached()
    res.setHeader('ETag', etag)
    res.setHeader('Cache-Control', CACHE)
    if (req.headers['if-none-match'] === etag) return res.status(304).end()
    res.json(value)
  }

  @Get('profile')
  @Header('Cache-Control', CACHE)
  async profile() {
    return (await this.bundle()).profile
  }

  @Get('projects')
  @Header('Cache-Control', CACHE)
  async projects() {
    return (await this.bundle()).projects
  }

  @Get('projects/:slug')
  @Header('Cache-Control', CACHE)
  async project(@Param('slug') slug: string) {
    const p = (await this.bundle()).projects.find((x) => x.slug === slug) ?? (await this.bundles.projectBySlug(slug))
    if (!p) throw new NotFoundException('Project not found')
    return p
  }

  @Get('skills')
  @Header('Cache-Control', CACHE)
  async skills() {
    const b = await this.bundle()
    return { categories: b.skillCategories, skills: b.skills }
  }

  @Get('experience')
  @Header('Cache-Control', CACHE)
  async experience() {
    return (await this.bundle()).experience
  }

  @Get('education')
  @Header('Cache-Control', CACHE)
  async education() {
    return (await this.bundle()).education
  }

  @Get('homepage')
  @Header('Cache-Control', CACHE)
  async homepage() {
    return (await this.bundle()).homepage
  }

  @Get('settings')
  @Header('Cache-Control', CACHE)
  async siteSettings() {
    const [b, s] = await Promise.all([this.bundle(), this.settings.get()])
    return {
      appearance: b.appearance,
      seo: b.seo,
      analytics: { enabled: s.analytics.enabled, requireConsent: s.analytics.requireConsent, respectDoNotTrack: s.analytics.respectDoNotTrack },
      contact: { enabled: s.contact.enabled },
    }
  }

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  async sitemap() {
    const b = await this.bundle()
    const site = b.seo.siteUrl
    const urls = [site, ...b.projects.map((p) => `${site}?project=${encodeURIComponent(p.slug)}`)]
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map((u) => `  <url><loc>${xml(u)}</loc></url>`),
      '</urlset>',
      '',
    ].join('\n')
  }

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  async robots(@Req() req: Request) {
    const { seo } = await this.bundle()
    const lines = ['User-agent: *', seo.robotsIndex ? 'Allow: /' : 'Disallow: /']
    // robots.txt cannot express "nofollow"; the portfolio also emits the robots meta tag.
    if (seo.robotsIndex) lines.push(`Sitemap: ${req.protocol}://${req.get('host')}/api/public/sitemap.xml`)
    return lines.join('\n') + '\n'
  }

  /** Draft bundle for a short-lived preview token. Never cached. */
  @Get('preview')
  @SkipThrottle({ default: false })
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Header('Cache-Control', 'no-store')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  async preview(@Query('token') token?: string) {
    if (!token || token.length > 200) throw new UnauthorizedException('Preview link is invalid or has expired')
    const t = await this.prisma.authToken.findUnique({ where: { tokenHash: sha256(token) }, include: { user: { select: { disabled: true } } } })
    if (!t || t.type !== 'PREVIEW' || t.expiresAt < new Date() || t.user.disabled) {
      throw new UnauthorizedException('Preview link is invalid or has expired')
    }
    return this.bundles.build('draft')
  }
}
