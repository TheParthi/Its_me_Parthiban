import type { PublicBundle } from '@pg/shared'
import { BUNDLED_RESUME } from './defaults'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "2026-08" or "2026-08-14" → "Aug 2026"; anything else → "". */
export function fmtYm(d: string | null | undefined): string {
  const m = d?.match(/^(\d{4})-(\d{2})/)
  if (!m) return ''
  const mi = Number(m[2]) - 1
  return mi >= 0 && mi < 12 ? `${MONTHS[mi]} ${m[1]}` : m[1]
}

export const yearOf = (d: string | null | undefined) => d?.match(/^(\d{4})/)?.[1] ?? ''

/** Only http(s) or same-site relative links are ever rendered as hrefs. */
export function safeHref(u: string | null | undefined): string | undefined {
  if (!u) return undefined
  const s = u.trim()
  if (/^https?:\/\//i.test(s)) return s
  if (/^(mailto:)/i.test(s)) return s
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s) && !s.startsWith('//')) return s // relative path
  return undefined
}

export const resumeHref = (b: PublicBundle) => safeHref(b.profile.resumeUrl) ?? BUNDLED_RESUME

/** "https://github.com/TheParthi" → "github.com/TheParthi". */
export const displayUrl = (u: string) => u.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/+$/, '')
