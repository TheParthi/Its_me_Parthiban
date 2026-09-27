import type { PublicBundle, SectionConfig } from '@pg/shared'
import { DEFAULT_APPEARANCE } from './defaults'
import { staticBundle } from './staticBundle'

/** API origin without a trailing slash, or null when the site runs static-only. */
export const API_URL: string | null = (() => {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
  if (!raw || !/^https?:\/\//i.test(raw)) return null
  return raw.replace(/\/+$/, '')
})()

export class HttpError extends Error {
  constructor(public status: number) {
    super(`HTTP ${status}`)
  }
}

/** GET JSON with a hard timeout; never throws synchronously. */
export async function getJson<T>(path: string, timeoutMs = 4000): Promise<T> {
  if (!API_URL) throw new Error('No API configured')
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${API_URL}${path}`, { signal: ctrl.signal, credentials: 'omit', headers: { Accept: 'application/json' } })
    if (!res.ok) throw new HttpError(res.status)
    return (await res.json()) as T
  } finally {
    clearTimeout(t)
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
/** Array or []. Typed callers keep their element type; unknown input needs an explicit T. */
function arr<T>(v: readonly T[] | null | undefined): T[]
function arr<T>(v: unknown): T[]
function arr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

const SECTION_TYPES = new Set(['hero', 'about', 'projects', 'lab', 'skills', 'experience', 'education', 'achievements', 'exploring', 'contact', 'footer'])

/**
 * Accepts anything that looks like a PublicBundle and fills gaps with safe
 * defaults, so a partially-implemented or older API can never blank the page.
 * Returns null when the payload is not a bundle at all.
 */
export function normalizeBundle(input: unknown): PublicBundle | null {
  if (!isObj(input) || !isObj(input.profile) || !isObj(input.homepage) || !Array.isArray(input.homepage.sections)) return null
  const fb = staticBundle()
  const p = input.profile as Partial<PublicBundle['profile']>
  const profile: PublicBundle['profile'] = {
    ...fb.profile,
    ...p,
    links: { ...fb.profile.links, ...(isObj(p.links) ? p.links : {}), others: arr(isObj(p.links) ? p.links.others : undefined) },
    availability: { ...fb.profile.availability, ...(isObj(p.availability) ? p.availability : {}) },
    hero: {
      ...fb.profile.hero,
      ...(isObj(p.hero) ? p.hero : {}),
      roles: arr<string>(isObj(p.hero) ? p.hero.roles : undefined).filter((r) => typeof r === 'string' && r.trim()),
    },
    about: { ...fb.profile.about, ...(isObj(p.about) ? p.about : {}) },
    exploring: arr(p.exploring),
    photo: isObj(p.photo) && typeof p.photo.url === 'string' ? (p.photo as PublicBundle['profile']['photo']) : null,
    cover: isObj(p.cover) && typeof p.cover.url === 'string' ? (p.cover as PublicBundle['profile']['cover']) : null,
    resumeUrl: typeof p.resumeUrl === 'string' && p.resumeUrl ? p.resumeUrl : null,
  }
  if (!profile.hero.roles.length) profile.hero.roles = [profile.title || 'Software Engineer']

  const h = input.homepage as Partial<PublicBundle['homepage']>
  const seen = new Set<string>()
  const sections = arr<Partial<SectionConfig>>(h.sections)
    .filter((s) => isObj(s) && typeof s.type === 'string' && SECTION_TYPES.has(s.type) && !seen.has(s.type) && seen.add(s.type))
    .map(
      (s): SectionConfig => ({
        type: s.type!,
        enabled: s.enabled !== false,
        eyebrow: s.eyebrow ?? '',
        heading: s.heading ?? '',
        description: s.description ?? '',
        background: s.background ?? 'default',
        spacing: s.spacing ?? 'normal',
      }),
    )
  if (!sections.some((s) => s.type === 'hero')) sections.unshift({ ...fb.homepage.sections[0] })

  const a = isObj(input.appearance) ? (input.appearance as Partial<PublicBundle['appearance']>) : {}
  const appearance: PublicBundle['appearance'] = {
    ...DEFAULT_APPEARANCE,
    ...a,
    colors: { ...DEFAULT_APPEARANCE.colors, ...(isObj(a.colors) ? a.colors : {}) },
    typography: { ...DEFAULT_APPEARANCE.typography, ...(isObj(a.typography) ? a.typography : {}) },
  }

  const projects = arr<PublicBundle['projects'][number]>(input.projects)
    .filter((x) => isObj(x) && typeof x.slug === 'string' && typeof x.title === 'string')
    .map((x) => ({
      ...x,
      links: arr(x.links),
      technologies: arr(x.technologies),
      features: arr(x.features),
      challenges: arr(x.challenges),
      architecture: arr(x.architecture),
      team: arr(x.team),
      screenshots: arr(x.screenshots),
      cover: isObj(x.cover) ? x.cover : null,
    }))

  return {
    version: typeof input.version === 'string' ? input.version : String(input.version ?? ''),
    profile,
    projects,
    skillCategories: arr(input.skillCategories),
    skills: arr<PublicBundle['skills'][number]>(input.skills).map((s) => ({ ...s, related: arr(s.related) })),
    experience: arr<PublicBundle['experience'][number]>(input.experience).map((e) => ({
      ...e,
      responsibilities: arr(e.responsibilities),
      technologies: arr(e.technologies),
    })),
    education: arr<PublicBundle['education'][number]>(input.education).map((e) => ({ ...e, achievements: arr(e.achievements) })),
    certifications: arr(input.certifications),
    achievements: arr(input.achievements),
    homepage: {
      sections,
      featuredProjectIds: arr<string>(h.featuredProjectIds),
      showArchive: h.showArchive !== false,
    },
    appearance,
    seo: { ...fb.seo, ...(isObj(input.seo) ? (input.seo as Partial<PublicBundle['seo']>) : {}) },
  }
}

export async function fetchBundle(): Promise<PublicBundle> {
  const b = normalizeBundle(await getJson<unknown>('/api/public/bundle'))
  if (!b) throw new Error('Malformed bundle')
  return b
}

export async function fetchPreview(token: string): Promise<PublicBundle> {
  const b = normalizeBundle(await getJson<unknown>(`/api/public/preview?token=${encodeURIComponent(token)}`, 6000))
  if (!b) throw new Error('Malformed preview bundle')
  return b
}

/** The subset of /api/public/settings the portfolio uses. */
export interface PublicSettings {
  analytics: { enabled: boolean; requireConsent: boolean; respectDoNotTrack: boolean }
  contact: { enabled: boolean }
}

export const SETTINGS_OFF: PublicSettings = {
  analytics: { enabled: false, requireConsent: true, respectDoNotTrack: true },
  contact: { enabled: false },
}

/** Tolerant parser: accepts `{ analytics, contact }` at the top level or under `settings`. */
export function parseSettings(input: unknown): PublicSettings {
  if (!isObj(input)) return SETTINGS_OFF
  const root = isObj(input.settings) ? input.settings : input
  const an = isObj(root.analytics) ? root.analytics : {}
  const ct = isObj(root.contact) ? root.contact : {}
  return {
    analytics: {
      enabled: an.enabled === true,
      // Privacy-first defaults when a flag is missing.
      requireConsent: an.requireConsent !== false,
      respectDoNotTrack: an.respectDoNotTrack !== false,
    },
    contact: { enabled: ct.enabled === true },
  }
}

export async function fetchSettings(): Promise<PublicSettings> {
  // Not render-blocking, so it can afford a longer timeout than the bundle.
  return parseSettings(await getJson<unknown>('/api/public/settings', 8000))
}
