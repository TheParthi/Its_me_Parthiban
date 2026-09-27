import type { PublicBundle } from '@pg/shared'
import { fmtYm, safeHref, yearOf } from './format'

export type MilestoneKind = string

export interface Milestone {
  id: string
  date: string
  title: string
  org: string
  kind: MilestoneKind
  /** 'role' | 'achievement' | 'certification' — decides the badge colour family. */
  group: 'role' | 'achievement' | 'certification'
  detail: string
  points: string[]
  meta: string[]
  link?: { label: string; href: string }
}

interface Keyed {
  m: Milestone
  /** Year used to interleave the three lists; undated entries inherit. */
  year: number
  dated: boolean
}

function withKeys(items: Milestone[], years: (number | null)[]): Keyed[] {
  // Undated entries take the year of the entry above them in their own list
  // (so they stay next to it); an undated first entry sinks to the end.
  let prev = Number.NEGATIVE_INFINITY
  return items.map((m, i) => {
    const y = years[i]
    if (y !== null) prev = y
    return { m, year: y ?? prev, dated: y !== null }
  })
}

/**
 * Merges experience, achievements and certifications into one timeline.
 * Each list keeps its CMS order; lists interleave newest-year first, with
 * current roles on top. On equal years dated entries come before undated
 * ones, and achievements/certifications before roles.
 */
export function buildTimeline(b: PublicBundle): Milestone[] {
  const roles: Milestone[] = b.experience.filter((e) => e.visible !== false).map((e) => {
    const start = fmtYm(e.startDate)
    const end = e.current ? 'Present' : fmtYm(e.endDate)
    return {
      id: `exp-${e.id}`,
      date: start && end ? `${start} — ${end}` : start || end,
      title: e.position,
      org: e.organization,
      kind: e.employmentType || 'Internship',
      group: 'role',
      detail: e.description,
      points: e.responsibilities.filter(Boolean),
      meta: e.technologies.filter(Boolean),
    }
  })
  const roleYears = b.experience
    .filter((e) => e.visible !== false)
    .map((e) => (e.current ? 9999 : Number(yearOf(e.endDate) || yearOf(e.startDate)) || null))

  const achievements: Milestone[] = b.achievements.filter((a) => a.visible !== false).map((a) => {
    const href = safeHref(a.verificationUrl)
    return {
      id: `ach-${a.id}`,
      // Achievement dates are usually known to the year only.
      date: yearOf(a.date) || (a.kind === 'Research' ? 'Ongoing' : ''),
      title: a.title,
      org: a.event,
      kind: a.kind,
      group: 'achievement',
      detail: a.description,
      points: [],
      meta: [],
      link: href && /^https?:/i.test(href) ? { label: 'Verify', href } : undefined,
    }
  })
  const achYears = b.achievements.filter((a) => a.visible !== false).map((a) => Number(yearOf(a.date)) || null)

  const certs: Milestone[] = b.certifications.filter((c) => c.visible !== false).map((c) => {
    const href = safeHref(c.credentialUrl)
    return {
      id: `cert-${c.id}`,
      date: fmtYm(c.issueDate),
      title: c.name,
      org: c.issuer,
      kind: 'Certified',
      group: 'certification',
      detail: c.description,
      points: [],
      meta: [],
      link: href && /^https?:/i.test(href) ? { label: 'Credential', href } : undefined,
    }
  })
  const certYears = b.certifications.filter((c) => c.visible !== false).map((c) => Number(yearOf(c.issueDate)) || null)

  // Priority on ties: achievements, certifications, roles.
  const lists = [withKeys(achievements, achYears), withKeys(certs, certYears), withKeys(roles, roleYears)]
  const heads = [0, 0, 0]
  const out: Milestone[] = []
  const better = (a: Keyed, b: Keyed) => (a.year !== b.year ? a.year > b.year : a.dated && !b.dated)
  for (;;) {
    let pick = -1
    for (let i = 0; i < lists.length; i++) {
      const cand = lists[i][heads[i]]
      if (!cand) continue
      if (pick === -1 || better(cand, lists[pick][heads[pick]])) pick = i
    }
    if (pick === -1) break
    out.push(lists[pick][heads[pick]++].m)
  }
  return out
}
