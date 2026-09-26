import { Injectable } from '@nestjs/common'
import { DEFAULT_SETTINGS, SiteSettings, siteSettingsSchema } from '@pg/shared'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

/** Runtime settings (no secrets). Cached briefly; writes clear the cache. */
@Injectable()
export class SettingsService {
  private cache: { value: SiteSettings; at: number } | null = null
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<SiteSettings> {
    if (this.cache && Date.now() - this.cache.at < 10_000) return this.cache.value
    const doc = await this.prisma.siteDocument.findUnique({ where: { key: 'SETTINGS' } })
    // Merge onto defaults so newly added settings always have a value.
    const merged = siteSettingsSchema.safeParse(deepMerge(DEFAULT_SETTINGS, (doc?.draft ?? {}) as object))
    const value = merged.success ? merged.data : DEFAULT_SETTINGS
    this.cache = { value, at: Date.now() }
    return value
  }

  async update(next: SiteSettings, userId: string) {
    const data = siteSettingsSchema.parse(next) as Prisma.InputJsonValue
    await this.prisma.siteDocument.upsert({
      where: { key: 'SETTINGS' },
      create: { key: 'SETTINGS', draft: data, published: data, status: 'PUBLISHED', updatedById: userId },
      update: { draft: data, published: data, status: 'PUBLISHED', updatedById: userId },
    })
    this.cache = null
    return this.get()
  }
}

function deepMerge<T>(base: T, over: object): T {
  if (typeof base !== 'object' || base === null || Array.isArray(base)) return (over as T) ?? base
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
  for (const [k, v] of Object.entries(over ?? {})) {
    const b = (base as Record<string, unknown>)[k]
    out[k] = b && typeof b === 'object' && !Array.isArray(b) && v && typeof v === 'object' ? deepMerge(b, v as object) : v
  }
  return out as T
}
