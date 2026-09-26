import {
  CONTENT_STATUS,
  achievementInputSchema,
  appearanceSchema,
  certificationInputSchema,
  educationInputSchema,
  experienceInputSchema,
  hexColor,
  homepageSchema,
  id,
  profileSchema,
  projectInputSchema,
  seoSchema,
  skillInputSchema,
  text,
} from '@pg/shared'
import { z, ZodType } from 'zod'

export const BACKUP_FORMAT = 'pg-portfolio-backup'
export const BACKUP_VERSION = 1

const date = z.coerce.date()
const status = z.enum(CONTENT_STATUS)

/** A draft/published row: both sides are validated with the entity's shared schema. */
const entry = <T extends ZodType>(schema: T) =>
  z.object({
    id,
    order: z.number().int(),
    status,
    draft: schema,
    published: schema.nullable(),
    publishedAt: date.nullable(),
    deletedAt: date.nullable().optional(),
  })

const doc = <K extends string, T extends ZodType>(key: K, schema: T) =>
  z.object({ key: z.literal(key), draft: schema, published: schema.nullable(), status, publishedAt: date.nullable() })

const media = z.object({
  id,
  storageKey: z.string().min(1).max(512),
  url: z.string().max(2048),
  fileName: z.string().max(255),
  originalName: z.string().max(255),
  mimeType: z.string().max(127),
  size: z.number().int().min(0),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  alt: z.string().max(500),
  category: z.enum(['PROFILE', 'PROJECT', 'ICON', 'BACKGROUND', 'DOCUMENT', 'OTHER']),
  checksum: z.string().max(128),
  createdAt: date,
})

export const backupSchema = z
  .object({
    format: z.literal(BACKUP_FORMAT),
    version: z.literal(BACKUP_VERSION),
    exportedAt: date,
    documents: z
      .array(
        z.discriminatedUnion('key', [
          doc('PROFILE', profileSchema),
          doc('HOMEPAGE', homepageSchema),
          doc('APPEARANCE', appearanceSchema),
          doc('SEO', seoSchema),
        ]),
      )
      .max(4),
    projects: z.array(entry(projectInputSchema).extend({ publishAt: date.nullable().optional() })).max(1000),
    skillCategories: z.array(z.object({ id, name: text(40).min(1), color: hexColor, order: z.number().int() })).max(200),
    skills: z.array(entry(skillInputSchema)).max(2000),
    experience: z.array(entry(experienceInputSchema)).max(1000),
    education: z.array(entry(educationInputSchema)).max(1000),
    certifications: z.array(entry(certificationInputSchema)).max(1000),
    achievements: z.array(entry(achievementInputSchema)).max(1000),
    media: z.array(media).max(10000).default([]),
  })
  .superRefine((b, ctx) => {
    const dup = <T>(items: T[], key: (t: T) => string, path: string) => {
      const seen = new Set<string>()
      for (const [i, t] of items.entries()) {
        const k = key(t)
        if (seen.has(k)) ctx.addIssue({ code: 'custom', path: [path, i], message: `Duplicate ${k}` })
        seen.add(k)
      }
    }
    dup(b.documents, (d) => d.key, 'documents')
    dup(b.projects, (p) => p.draft.slug, 'projects')
    dup(b.skillCategories, (c) => c.name, 'skillCategories')
    const cats = new Set(b.skillCategories.map((c) => c.id))
    for (const [i, s] of b.skills.entries()) {
      if (!cats.has(s.draft.categoryId)) ctx.addIssue({ code: 'custom', path: ['skills', i, 'draft', 'categoryId'], message: 'Unknown skill category' })
    }
  })
export type Backup = z.infer<typeof backupSchema>
