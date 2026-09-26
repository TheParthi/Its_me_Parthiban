import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import {
  AchievementInput,
  Appearance,
  CertificationInput,
  DEFAULT_APPEARANCE,
  EducationInput,
  ExperienceInput,
  HomepageConfig,
  Profile,
  ProjectInput,
  PublicBundle,
  PublicMedia,
  PublicProject,
  PublicSkill,
  SECTION_TYPES,
  Seo,
  SkillInput,
  sectionSchema,
} from '@pg/shared'
import { Prisma } from '@prisma/client'
import { env } from '../config/env'
import { PrismaService } from '../prisma/prisma.service'
import { PublicCacheService } from './public-cache.service'

export type BundleMode = 'published' | 'draft'

interface Row {
  id: string
  draft: Prisma.JsonValue
  published: Prisma.JsonValue | null
}

const visible = (d: unknown) => (d as { visible?: boolean }).visible !== false

export const DEFAULT_HOMEPAGE: HomepageConfig = {
  sections: SECTION_TYPES.map((type) => sectionSchema.parse({ type, enabled: true })),
  featuredProjectIds: [],
  showArchive: true,
}

export function defaultSeo(): Seo {
  const siteUrl = env().PUBLIC_SITE_URL
  return {
    siteUrl,
    title: 'Portfolio',
    description: '',
    ogTitle: '',
    ogDescription: '',
    ogImageId: null,
    canonicalUrl: siteUrl,
    robotsIndex: true,
    robotsFollow: true,
    twitterCard: 'summary_large_image',
    structuredData: true,
  }
}

/**
 * Builds the portfolio bundle. `published` serves the public site; `draft`
 * serves authenticated previews and reads every draft that is not trashed
 * or archived. Media ids are resolved to URLs in a single query.
 */
@Injectable()
export class BundleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: PublicCacheService,
  ) {}

  /** Rows visible in this mode, paired with the data to show. */
  private async rows<T>(model: 'project' | 'skill' | 'experience' | 'education' | 'certification' | 'achievement', mode: BundleMode) {
    const where = mode === 'published' ? { status: 'PUBLISHED', deletedAt: null } : { status: { not: 'ARCHIVED' }, deletedAt: null }
    const delegate = this.prisma[model] as unknown as { findMany(a: object): Promise<Row[]> }
    const rows = await delegate.findMany({ where, orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] })
    return rows
      .map((r) => ({ id: r.id, data: (mode === 'published' ? r.published : r.draft) as T | null }))
      .filter((r): r is { id: string; data: T } => r.data != null)
  }

  private async documents(mode: BundleMode) {
    const docs = await this.prisma.siteDocument.findMany({ where: { key: { in: ['PROFILE', 'HOMEPAGE', 'APPEARANCE', 'SEO'] } } })
    const pick = <T>(key: string) => {
      const d = docs.find((x) => x.key === key)
      return ((mode === 'published' ? d?.published : d?.draft) ?? null) as T | null
    }
    return {
      profile: pick<Profile>('PROFILE'),
      homepage: pick<HomepageConfig>('HOMEPAGE') ?? DEFAULT_HOMEPAGE,
      appearance: pick<Appearance>('APPEARANCE') ?? DEFAULT_APPEARANCE,
      seo: pick<Seo>('SEO') ?? defaultSeo(),
    }
  }

  private async media(ids: (string | null | undefined)[]) {
    const wanted = [...new Set(ids.filter((x): x is string => !!x))]
    const rows = wanted.length
      ? await this.prisma.mediaAsset.findMany({ where: { id: { in: wanted } }, select: { id: true, url: true, alt: true, width: true, height: true } })
      : []
    const map = new Map<string, PublicMedia>(rows.map((m) => [m.id, m]))
    return (id: string | null | undefined) => (id ? map.get(id) ?? null : null)
  }

  private toProject(id: string, d: ProjectInput, m: (id?: string | null) => PublicMedia | null): PublicProject {
    const { coverId, screenshotIds, ...rest } = d
    return { ...rest, id, cover: m(coverId), screenshots: screenshotIds.map(m).filter((x): x is PublicMedia => !!x) }
  }

  async build(mode: BundleMode): Promise<PublicBundle> {
    const [docs, projects, skills, categories, experience, education, certifications, achievements] = await Promise.all([
      this.documents(mode),
      this.rows<ProjectInput>('project', mode),
      this.rows<SkillInput>('skill', mode),
      this.prisma.skillCategory.findMany({ orderBy: [{ order: 'asc' }, { name: 'asc' }] }),
      this.rows<ExperienceInput>('experience', mode),
      this.rows<EducationInput>('education', mode),
      this.rows<CertificationInput>('certification', mode),
      this.rows<AchievementInput>('achievement', mode),
    ])
    const { profile, homepage, appearance, seo } = docs
    if (!profile) throw new ServiceUnavailableException('The portfolio has not been published yet')

    const listed = projects.filter((p) => p.data.visibility !== 'UNLISTED')
    const catById = new Map(categories.map((c) => [c.id, c]))
    const shownSkills = skills.filter((s) => visible(s.data) && catById.has(s.data.categoryId))
    const certs = certifications.filter((c) => visible(c.data))
    const achs = achievements.filter((a) => visible(a.data))

    const m = await this.media([
      profile.photoId,
      profile.coverId,
      profile.resumeId,
      seo.ogImageId,
      ...listed.flatMap((p) => [p.data.coverId, ...p.data.screenshotIds]),
      ...shownSkills.map((s) => s.data.iconId),
      ...certs.map((c) => c.data.imageId),
      ...achs.map((a) => a.data.mediaId),
    ])

    const { photoId, coverId, resumeId, ...profileRest } = profile
    const { ogImageId, ...seoRest } = seo
    const usedCats = new Set(shownSkills.map((s) => s.data.categoryId))

    return {
      version: mode === 'published' ? this.cache.currentVersion : `draft-${Date.now()}`,
      profile: {
        ...profileRest,
        location: profile.showLocation ? profile.location : '',
        photo: m(photoId),
        cover: m(coverId),
        resumeUrl: m(resumeId)?.url ?? null,
      },
      projects: listed.map((p) => this.toProject(p.id, p.data, m)),
      skillCategories: categories.filter((c) => usedCats.has(c.id)).map((c) => ({ id: c.id, name: c.name, color: c.color })),
      skills: shownSkills.map(({ id, data: s }): PublicSkill => {
        const cat = catById.get(s.categoryId)!
        return {
          id,
          name: s.name,
          category: cat.name,
          categoryColor: cat.color,
          note: s.note,
          related: s.related,
          featured: s.featured,
          proficiency: s.proficiency ?? null,
          icon: m(s.iconId),
        }
      }),
      experience: experience.filter((e) => visible(e.data)).map((e) => ({ ...e.data, id: e.id })),
      education: education.filter((e) => visible(e.data)).map((e) => ({ ...e.data, id: e.id })),
      certifications: certs.map(({ id, data: { imageId, ...c } }) => ({ ...c, id, image: m(imageId) })),
      achievements: achs.map(({ id, data: { mediaId, ...a } }) => ({ ...a, id, media: m(mediaId) })),
      homepage,
      appearance,
      seo: { ...seoRest, ogImage: m(ogImageId) },
    }
  }

  /** A single published project by its published slug; UNLISTED projects are reachable here. */
  async projectBySlug(slug: string): Promise<PublicProject | null> {
    const p = await this.prisma.project.findFirst({
      where: { status: 'PUBLISHED', deletedAt: null, published: { path: ['slug'], equals: slug } },
    })
    if (!p?.published) return null
    const d = p.published as unknown as ProjectInput
    const m = await this.media([d.coverId, ...d.screenshotIds])
    return this.toProject(p.id, d, m)
  }
}
