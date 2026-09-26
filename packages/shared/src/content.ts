import { z } from 'zod'

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** http(s) only — blocks javascript:, data: and other unsafe schemes. */
export const safeUrl = z
  .string()
  .trim()
  .max(2048)
  .url()
  .refine((u) => /^https?:\/\//i.test(u), 'Only http(s) links are allowed')

export const optionalUrl = z.union([safeUrl, z.literal('')]).optional()

export const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex colour like #8B5CF6')

export const slug = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, numbers and single dashes')

/** Plain text: trimmed, no angle brackets so it can never become markup. */
export const text = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((s) => !/[<>]/.test(s), 'HTML is not allowed here')

/** Markdown body. The API strips raw HTML before saving. */
export const markdown = (max = 20000) => z.string().max(max)

export const id = z.string().min(1).max(64)
export const mediaRef = id.nullable().optional()
export const isoDate = z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/, 'Use YYYY-MM or YYYY-MM-DD').nullable().optional()

export const CONTENT_STATUS = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const
export type ContentStatus = (typeof CONTENT_STATUS)[number]

export const link = z.object({ label: text(40).min(1), href: safeUrl })
export type Link = z.infer<typeof link>

// ---------------------------------------------------------------------------
// Profile (singleton)
// ---------------------------------------------------------------------------

export const profileSchema = z.object({
  fullName: text(80).min(1),
  firstName: text(40).min(1),
  initials: text(4).min(1),
  title: text(120),
  tagline: text(160),
  shortBio: text(400),
  longBio: markdown(8000),
  photoId: mediaRef,
  coverId: mediaRef,
  resumeId: mediaRef,
  location: text(80),
  showLocation: z.boolean(),
  email: z.string().trim().email().max(254),
  links: z.object({
    github: optionalUrl,
    linkedin: optionalUrl,
    leetcode: optionalUrl,
    others: z.array(link).max(10),
  }),
  availability: z.object({ available: z.boolean(), label: text(60) }),
  hero: z.object({
    roles: z.array(text(60).min(1)).min(1).max(8),
    description: text(300),
  }),
  about: z.object({
    heading: text(80),
    lead: text(600),
    paragraphs: z.array(text(800)).max(6),
    principles: z.array(z.object({ title: text(30).min(1), text: text(160) })).max(6),
    facts: z.array(z.object({ k: text(20).min(1), v: text(80) })).max(8),
  }),
  exploring: z.array(z.object({ topic: text(80).min(1), note: text(200) })).max(12),
})
export type Profile = z.infer<typeof profileSchema>

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export const PREVIEW_STYLES = ['mobility', 'delivery', 'security', 'vision', 'image'] as const
export const FEATURE_STATUS = ['shipped', 'in-progress', 'proposed'] as const

export const projectInputSchema = z.object({
  title: text(80).min(1),
  slug,
  fullTitle: text(200).optional().default(''),
  category: text(120),
  statusLabel: text(80).optional().default(''),
  shortDescription: text(400),
  description: markdown(),
  contribution: markdown(8000).optional().default(''),
  accent: hexColor.default('#00E5FF'),
  previewStyle: z.enum(PREVIEW_STYLES).default('image'),
  coverId: mediaRef,
  screenshotIds: z.array(id).max(20).default([]),
  videoUrl: optionalUrl,
  repoUrl: optionalUrl,
  demoUrl: optionalUrl,
  links: z.array(link).max(8).default([]),
  technologies: z.array(text(40).min(1)).max(30).default([]),
  features: z.array(z.object({ text: text(200).min(1), status: z.enum(FEATURE_STATUS) })).max(20).default([]),
  challenges: z.array(z.object({ title: text(80).min(1), text: text(600) })).max(10).default([]),
  architecture: z.array(z.object({ layer: text(40).min(1), detail: text(400) })).max(10).default([]),
  team: z.array(text(80)).max(20).default([]),
  note: text(300).optional().default(''),
  featured: z.boolean().default(false),
  visibility: z.enum(['PUBLIC', 'UNLISTED']).default('PUBLIC'),
  startDate: isoDate,
  endDate: isoDate,
  seoTitle: text(70).optional().default(''),
  seoDescription: text(170).optional().default(''),
})
export type ProjectInput = z.infer<typeof projectInputSchema>
export const projectUpdateSchema = projectInputSchema.partial()

export interface ProjectAdmin extends ProjectInput {
  id: string
  order: number
  status: ContentStatus
  hasUnpublishedChanges: boolean
  publishedAt: string | null
  publishAt: string | null
  updatedAt: string
  deletedAt: string | null
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

export const skillCategorySchema = z.object({ name: text(40).min(1), color: hexColor.default('#8B5CF6') })
export type SkillCategoryInput = z.infer<typeof skillCategorySchema>

export const skillInputSchema = z.object({
  name: text(40).min(1),
  categoryId: id,
  note: text(200).default(''),
  related: z.array(text(40)).max(10).default([]),
  iconId: mediaRef,
  featured: z.boolean().default(false),
  visible: z.boolean().default(true),
  /** Optional, manual 1–5. Never shown as a percentage. */
  proficiency: z.number().int().min(1).max(5).nullable().optional(),
})
export type SkillInput = z.infer<typeof skillInputSchema>

// ---------------------------------------------------------------------------
// Experience, education, certifications, achievements
// ---------------------------------------------------------------------------

export const experienceInputSchema = z.object({
  position: text(100).min(1),
  organization: text(100).min(1),
  employmentType: z.enum(['Internship', 'Full-time', 'Part-time', 'Contract', 'Freelance', 'Volunteer']).default('Internship'),
  location: text(80).default(''),
  startDate: isoDate,
  endDate: isoDate,
  current: z.boolean().default(false),
  description: text(400).default(''),
  responsibilities: z.array(text(400)).max(12).default([]),
  technologies: z.array(text(40)).max(20).default([]),
  visible: z.boolean().default(true),
})
export type ExperienceInput = z.infer<typeof experienceInputSchema>

export const educationInputSchema = z.object({
  institution: text(120).min(1),
  degree: text(120).min(1),
  field: text(120).default(''),
  startYear: z.number().int().min(1950).max(2100).nullable().optional(),
  graduationYear: z.number().int().min(1950).max(2100).nullable().optional(),
  grade: text(40).default(''),
  description: text(600).default(''),
  achievements: z.array(text(200)).max(10).default([]),
  visible: z.boolean().default(true),
})
export type EducationInput = z.infer<typeof educationInputSchema>

export const certificationInputSchema = z.object({
  name: text(120).min(1),
  issuer: text(120).min(1),
  issueDate: isoDate,
  expirationDate: isoDate,
  credentialUrl: optionalUrl,
  imageId: mediaRef,
  description: text(300).default(''),
  visible: z.boolean().default(true),
})
export type CertificationInput = z.infer<typeof certificationInputSchema>

export const ACHIEVEMENT_KINDS = ['Winner', 'Selected', 'Participated', 'Research', 'Award', 'Other'] as const
export const achievementInputSchema = z.object({
  title: text(120).min(1),
  kind: z.enum(ACHIEVEMENT_KINDS),
  event: text(120).default(''),
  date: isoDate,
  description: text(600).default(''),
  mediaId: mediaRef,
  verificationUrl: optionalUrl,
  visible: z.boolean().default(true),
})
export type AchievementInput = z.infer<typeof achievementInputSchema>

/** Collections that share the generic list-content API. */
export const COLLECTIONS = ['experience', 'education', 'certifications', 'achievements'] as const
export type Collection = (typeof COLLECTIONS)[number]
export const collectionSchemas = {
  experience: experienceInputSchema,
  education: educationInputSchema,
  certifications: certificationInputSchema,
  achievements: achievementInputSchema,
} as const

// ---------------------------------------------------------------------------
// Homepage builder
// ---------------------------------------------------------------------------

export const SECTION_TYPES = [
  'hero',
  'about',
  'projects',
  'lab',
  'skills',
  'experience',
  'education',
  'achievements',
  'exploring',
  'contact',
  'footer',
] as const
export type SectionType = (typeof SECTION_TYPES)[number]

export const sectionSchema = z.object({
  type: z.enum(SECTION_TYPES),
  enabled: z.boolean(),
  eyebrow: text(40).optional().default(''),
  heading: text(120).optional().default(''),
  description: text(400).optional().default(''),
  background: z.enum(['default', 'grid', 'glow', 'plain']).default('default'),
  spacing: z.enum(['compact', 'normal', 'spacious']).default('normal'),
})
export type SectionConfig = z.infer<typeof sectionSchema>

export const homepageSchema = z
  .object({
    sections: z.array(sectionSchema).min(1).max(SECTION_TYPES.length),
    /** Explicit featured order; empty = projects flagged "featured", by order. */
    featuredProjectIds: z.array(id).max(8).default([]),
    showArchive: z.boolean().default(true),
  })
  .refine((h) => new Set(h.sections.map((s) => s.type)).size === h.sections.length, 'Each section can appear once')
  .refine((h) => h.sections.some((s) => s.type === 'hero' && s.enabled), 'The hero section must stay enabled')
export type HomepageConfig = z.infer<typeof homepageSchema>

// ---------------------------------------------------------------------------
// Appearance — validated design tokens only, never raw CSS.
// ---------------------------------------------------------------------------

export const FONT_PRESETS = {
  'space-grotesk': { label: 'Space Grotesk', family: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif" },
  inter: { label: 'Inter', family: "'Inter', ui-sans-serif, system-ui, sans-serif" },
  sora: { label: 'Sora', family: "'Sora', ui-sans-serif, system-ui, sans-serif" },
  manrope: { label: 'Manrope', family: "'Manrope', ui-sans-serif, system-ui, sans-serif" },
  'ibm-plex-sans': { label: 'IBM Plex Sans', family: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif" },
  'jetbrains-mono': { label: 'JetBrains Mono', family: "'JetBrains Mono', ui-monospace, monospace" },
} as const
export type FontPreset = keyof typeof FONT_PRESETS
const fontPreset = z.enum(Object.keys(FONT_PRESETS) as [FontPreset, ...FontPreset[]])

export const appearanceSchema = z.object({
  colors: z.object({
    background: hexColor,
    surface: hexColor,
    surfaceRaised: hexColor,
    text: hexColor,
    textMuted: hexColor,
    accent: hexColor,
    accentSecondary: hexColor,
    border: hexColor,
  }),
  typography: z.object({ display: fontPreset, body: fontPreset, mono: fontPreset }),
  headingScale: z.number().min(0.8).max(1.25),
  radius: z.enum(['sharp', 'soft', 'round']),
  buttonStyle: z.enum(['pill', 'rounded', 'square']),
  sectionSpacing: z.enum(['compact', 'normal', 'spacious']),
  navStyle: z.enum(['floating', 'solid']),
  motion: z.enum(['full', 'reduced', 'off']),
  showGrain: z.boolean(),
  show3dHero: z.boolean(),
})
export type Appearance = z.infer<typeof appearanceSchema>

export const DEFAULT_APPEARANCE: Appearance = {
  colors: {
    background: '#08090D',
    surface: '#101218',
    surfaceRaised: '#161923',
    text: '#F5F7FA',
    textMuted: '#969BA8',
    accent: '#8B5CF6',
    accentSecondary: '#00E5FF',
    border: '#24262E',
  },
  typography: { display: 'space-grotesk', body: 'inter', mono: 'jetbrains-mono' },
  headingScale: 1,
  radius: 'round',
  buttonStyle: 'pill',
  sectionSpacing: 'normal',
  navStyle: 'floating',
  motion: 'full',
  showGrain: true,
  show3dHero: true,
}

// ---------------------------------------------------------------------------
// SEO
// ---------------------------------------------------------------------------

export const seoSchema = z.object({
  siteUrl: safeUrl,
  title: text(70).min(1),
  description: text(170),
  ogTitle: text(90),
  ogDescription: text(200),
  ogImageId: mediaRef,
  canonicalUrl: optionalUrl,
  robotsIndex: z.boolean(),
  robotsFollow: z.boolean(),
  twitterCard: z.enum(['summary', 'summary_large_image']),
  structuredData: z.boolean(),
})
export type Seo = z.infer<typeof seoSchema>

// ---------------------------------------------------------------------------
// Contact
// ---------------------------------------------------------------------------

export const contactSubmitSchema = z.object({
  name: text(80).min(2),
  email: z.string().trim().email().max(254),
  subject: text(140).min(3),
  message: z.string().trim().min(10).max(5000),
  /** Honeypot — must stay empty. */
  website: z.string().max(0).optional().default(''),
  /** Milliseconds between form render and submit; bots submit instantly. */
  elapsedMs: z.number().int().min(0).max(86_400_000),
})
export type ContactSubmit = z.infer<typeof contactSubmitSchema>
export const MESSAGE_STATUS = ['NEW', 'READ', 'REPLIED', 'ARCHIVED', 'SPAM'] as const
export type MessageStatus = (typeof MESSAGE_STATUS)[number]

// ---------------------------------------------------------------------------
// Public bundle — everything the portfolio needs in one request.
// Only published data; media refs resolved to URLs.
// ---------------------------------------------------------------------------

export interface PublicMedia {
  id: string
  url: string
  alt: string
  width: number | null
  height: number | null
}

export interface PublicProject extends Omit<ProjectInput, 'coverId' | 'screenshotIds'> {
  id: string
  cover: PublicMedia | null
  screenshots: PublicMedia[]
}

export interface PublicSkill {
  id: string
  name: string
  category: string
  categoryColor: string
  note: string
  related: string[]
  featured: boolean
  proficiency: number | null
  icon: PublicMedia | null
}

export interface PublicBundle {
  version: string
  profile: Omit<Profile, 'photoId' | 'coverId' | 'resumeId'> & {
    photo: PublicMedia | null
    cover: PublicMedia | null
    resumeUrl: string | null
  }
  projects: PublicProject[]
  skillCategories: { id: string; name: string; color: string }[]
  skills: PublicSkill[]
  experience: (ExperienceInput & { id: string })[]
  education: (EducationInput & { id: string })[]
  certifications: (Omit<CertificationInput, 'imageId'> & { id: string; image: PublicMedia | null })[]
  achievements: (Omit<AchievementInput, 'mediaId'> & { id: string; media: PublicMedia | null })[]
  homepage: HomepageConfig
  appearance: Appearance
  seo: Omit<Seo, 'ogImageId'> & { ogImage: PublicMedia | null }
}
