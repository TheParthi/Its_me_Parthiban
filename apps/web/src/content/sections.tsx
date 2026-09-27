import type { PublicBundle, SectionConfig, SectionType } from '@pg/shared'
import type { CSSProperties } from 'react'
import { useContent } from './context'

export interface SectionView {
  type: SectionType
  enabled: boolean
  eyebrow: string
  heading: string
  description: string
  /** Running number shown in the section label ("01", "02"…). */
  index: string
  background: 'default' | 'grid' | 'glow' | 'plain'
  spacing: 'compact' | 'normal' | 'spacious'
}

const BACKGROUNDS = ['default', 'grid', 'glow', 'plain'] as const
const SPACINGS = ['compact', 'normal', 'spacious'] as const
const UNNUMBERED: SectionType[] = ['hero', 'footer']

/** Enabled sections in homepage order, with overrides and running numbers. */
export function sectionViews(bundle: PublicBundle): SectionView[] {
  let n = 0
  return bundle.homepage.sections
    .filter((s) => s.enabled)
    .map((s: SectionConfig) => ({
      type: s.type,
      enabled: true,
      eyebrow: s.eyebrow?.trim() ?? '',
      heading: s.heading?.trim() ?? '',
      description: s.description?.trim() ?? '',
      index: UNNUMBERED.includes(s.type) ? '' : String(++n).padStart(2, '0'),
      background: (BACKGROUNDS as readonly string[]).includes(s.background) ? s.background : 'default',
      spacing: (SPACINGS as readonly string[]).includes(s.spacing) ? s.spacing : 'normal',
    }))
}

const FALLBACK_VIEW = (type: SectionType): SectionView => ({
  type,
  enabled: false,
  eyebrow: '',
  heading: '',
  description: '',
  index: '',
  background: 'default',
  spacing: 'normal',
})

/** The section's config; components use `view.heading || 'default copy'`. */
export function useSection(type: SectionType): SectionView {
  const { bundle } = useContent()
  return sectionViews(bundle).find((v) => v.type === type) ?? FALLBACK_VIEW(type)
}

// Nav keeps a fixed, familiar order regardless of page order; only sections
// that are enabled appear.
const NAV_ORDER: { id: SectionType; label: string }[] = [
  { id: 'about', label: 'About' },
  { id: 'projects', label: 'Projects' },
  { id: 'experience', label: 'Experience' },
  { id: 'skills', label: 'Skills' },
  { id: 'education', label: 'Education' },
  { id: 'achievements', label: 'Achievements' },
  { id: 'contact', label: 'Contact' },
]

export function useNavItems(): { id: string; label: string }[] {
  const { bundle } = useContent()
  const enabled = new Set(bundle.homepage.sections.filter((s) => s.enabled).map((s) => s.type))
  // Sections that render nothing without content stay out of the nav.
  if (!bundle.education.some((e) => e.visible !== false)) enabled.delete('education')
  if (!bundle.achievements.some((a) => a.visible !== false) && !bundle.certifications.some((c) => c.visible !== false))
    enabled.delete('achievements')
  return [{ id: 'home', label: 'Home' }, ...NAV_ORDER.filter((n) => enabled.has(n.id))]
}

interface Pad {
  pt: string
  pb: string
  ptMd?: string
  pbMd?: string
}

/**
 * Attributes for a <section>: spacing preset (scales the section's own
 * padding; the global appearance.sectionSpacing multiplies on top) and the
 * background preset, which CSS uses to hide the default decorations.
 */
export function sectionAttrs(view: SectionView, pad: Pad) {
  return {
    'data-bg': view.background,
    'data-spacing': view.spacing,
    style: {
      '--pt': pad.pt,
      '--pb': pad.pb,
      '--pt-md': pad.ptMd ?? pad.pt,
      '--pb-md': pad.pbMd ?? pad.pb,
    } as CSSProperties,
  }
}

export const PAD_DEFAULT: Pad = { pt: '8rem', pb: '8rem', ptMd: '11rem', pbMd: '11rem' }

/** Decorative layer for the 'grid' and 'glow' background presets. */
export function SectionBackdrop({ view }: { view: SectionView }) {
  if (view.background === 'grid')
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="bg-grid absolute inset-0 opacity-40 [mask-image:linear-gradient(to_bottom,transparent,#000_18%,#000_82%,transparent)]" />
      </div>
    )
  if (view.background === 'glow')
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[18%] h-[520px] w-[900px] max-w-[140vw] -translate-x-1/2 rounded-full bg-violet/12 blur-[150px]" />
        <div className="absolute -right-32 bottom-[10%] h-[360px] w-[360px] rounded-full bg-cyan/8 blur-[140px]" />
      </div>
    )
  return null
}

/** Class for the big display headings; multiplies their clamp() by --heading-scale. */
export const headingSize = {
  xl: 'text-[calc(clamp(3rem,8vw,7rem)*var(--heading-scale,1))]',
  lg: 'text-[calc(clamp(2.8rem,7.5vw,6.5rem)*var(--heading-scale,1))]',
  md: 'text-[calc(clamp(2.8rem,6.5vw,5.5rem)*var(--heading-scale,1))]',
  contact: 'text-[calc(clamp(2.8rem,7.5vw,7rem)*var(--heading-scale,1))]',
  hero: 'text-[calc(clamp(3.2rem,9vw,8.5rem)*var(--heading-scale,1))]',
} as const
