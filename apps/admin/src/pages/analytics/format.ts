import type { AnalyticsOverview } from '@pg/shared'

const hourFmt = new Intl.DateTimeFormat('en', { hour: 'numeric' })
const dayFmt = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' })
const fullFmt = new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' })
const fullHourFmt = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

/** Axis + tooltip formatters for a series bucket ("hour" or "day"). */
export function bucketFormatters(bucket: 'hour' | 'day') {
  const safe = (f: Intl.DateTimeFormat) => (iso: string) => {
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? iso : f.format(d)
  }
  return bucket === 'hour'
    ? { tick: safe(hourFmt), label: safe(fullHourFmt) }
    : { tick: safe(dayFmt), label: safe(fullFmt) }
}

/** True when the overview holds no recorded activity at all. */
export function isEmptyOverview(o: AnalyticsOverview) {
  const c = o.cards
  const any =
    c.sessions.value + c.pageViews.value + c.projectViews.value + c.contactSubmissions.value +
    o.clicks.github + o.clicks.linkedin + o.clicks.resume + o.clicks.cta
  return any === 0 && o.series.every((s) => s.sessions + s.pageViews + s.submissions === 0)
}

export const SOURCE_LABELS: Record<string, string> = {
  direct: 'Direct',
  search: 'Search',
  social: 'Social',
  referral: 'Referral',
  campaign: 'Campaign',
  internal: 'Internal',
}
export const sourceLabel = (k: string) => SOURCE_LABELS[k] ?? k

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)
export const deviceLabel = (k: string) => cap(k)

const STEP_LABELS: Record<string, string> = {
  github: 'GitHub',
  repo: 'GitHub',
  linkedin: 'LinkedIn',
  resume: 'Résumé',
  contact: 'Contact sent',
  demo: 'Demo',
  link: 'Link',
}

/** Human label for a page path. */
export function pathLabel(path: string) {
  if (path === '/' || path === '') return 'Home'
  const last = path.split('?')[0].split('/').filter(Boolean)
  if (last[0] === 'projects' && last.length === 1) return 'Projects'
  return last.map((p) => cap(decodeURIComponent(p).replace(/-/g, ' '))).join(' / ')
}

/** Journey step → chip label ("/" → Home, "project:x" → title, "github" → GitHub). */
export function stepLabel(step: string, titles: Map<string, string>) {
  if (step.startsWith('/')) return pathLabel(step)
  if (step.startsWith('project:')) {
    const slug = step.slice('project:'.length)
    return titles.get(slug) ?? slug
  }
  return STEP_LABELS[step.toLowerCase()] ?? cap(step)
}

export type StepKind = 'page' | 'project' | 'action'
export const stepKind = (step: string): StepKind => (step.startsWith('/') ? 'page' : step.startsWith('project:') ? 'project' : 'action')

/** Short, display-only form of an anonymous id. */
export const shortId = (id: string | null | undefined) => (id ? id.slice(0, 8) : '—')
