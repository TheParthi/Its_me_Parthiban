import { projectInputSchema, type PREVIEW_STYLES, type ProjectAdmin, type ProjectInput } from '@pg/shared'
import type { FieldErrors } from '../../lib/forms'

/** Every editable key of a project draft, in schema order. */
export const INPUT_KEYS = Object.keys(projectInputSchema.shape) as (keyof ProjectInput)[]

export const EMPTY_PROJECT: ProjectInput = {
  title: '',
  slug: '',
  fullTitle: '',
  category: '',
  statusLabel: '',
  shortDescription: '',
  description: '',
  contribution: '',
  accent: '#00E5FF',
  previewStyle: 'image',
  coverId: null,
  screenshotIds: [],
  videoUrl: '',
  repoUrl: '',
  demoUrl: '',
  links: [],
  technologies: [],
  features: [],
  challenges: [],
  architecture: [],
  team: [],
  note: '',
  featured: false,
  visibility: 'PUBLIC',
  startDate: null,
  endDate: null,
  seoTitle: '',
  seoDescription: '',
}

/** Editable draft from the admin shape, with defaults for anything missing. */
export function toInput(p: ProjectAdmin): ProjectInput {
  const out = { ...EMPTY_PROJECT } as Record<string, unknown>
  for (const k of INPUT_KEYS) {
    const v = (p as unknown as Record<string, unknown>)[k]
    if (v !== undefined) out[k] = v
  }
  return out as ProjectInput
}

/** Top-level keys whose values differ between two drafts. */
export function changedKeys(a: ProjectInput, b: ProjectInput): (keyof ProjectInput)[] {
  return INPUT_KEYS.filter((k) => JSON.stringify(a[k] ?? null) !== JSON.stringify(b[k] ?? null))
}

export type TabKey = 'general' | 'description' | 'tech' | 'media' | 'details' | 'seo' | 'publishing'

export const TAB_LABELS: Record<TabKey, string> = {
  general: 'General',
  description: 'Description',
  tech: 'Technology Stack',
  media: 'Images & Media',
  details: 'Technical Details',
  seo: 'SEO',
  publishing: 'Publishing',
}

const FIELD_TAB: Record<keyof ProjectInput, TabKey> = {
  title: 'general',
  slug: 'general',
  fullTitle: 'general',
  category: 'general',
  statusLabel: 'general',
  featured: 'general',
  visibility: 'general',
  startDate: 'general',
  endDate: 'general',
  accent: 'general',
  previewStyle: 'general',
  shortDescription: 'description',
  description: 'description',
  contribution: 'description',
  technologies: 'tech',
  coverId: 'media',
  screenshotIds: 'media',
  videoUrl: 'media',
  features: 'details',
  challenges: 'details',
  architecture: 'details',
  team: 'details',
  repoUrl: 'details',
  demoUrl: 'details',
  links: 'details',
  note: 'details',
  seoTitle: 'seo',
  seoDescription: 'seo',
}

export function tabOf(path: string): TabKey {
  const head = path.split('.')[0] as keyof ProjectInput
  return FIELD_TAB[head] ?? 'general'
}

export function tabsWithErrors(errors: FieldErrors): Set<TabKey> {
  return new Set(Object.keys(errors).map(tabOf))
}

export const PREVIEW_STYLE_INFO: Record<(typeof PREVIEW_STYLES)[number], { label: string; description: string }> = {
  mobility: { label: 'Mobility', description: 'Tracking dashboard: city grid, live route and a moving vehicle.' },
  delivery: { label: 'Delivery', description: 'Phone mockup with a menu and a live order tracker.' },
  security: { label: 'Security', description: 'Wallet graph with transaction paths, flagged clusters and a risk gauge.' },
  vision: { label: 'Vision', description: 'Lab dashboard: scan line, detection boxes and a device monitor.' },
  image: { label: 'Image', description: 'Cover image or first screenshot; accent-coloured placeholder if neither.' },
}

/** Props every editor tab receives. */
export interface TabProps {
  value: ProjectInput
  set: <K extends keyof ProjectInput>(key: K, v: ProjectInput[K]) => void
  errors: FieldErrors
  disabled?: boolean
}
