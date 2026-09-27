import type { UseQueryResult } from '@tanstack/react-query'
import type { Collection, Permission } from '@pg/shared'
import { useCollection, useDocument, useProjects, useSkills } from '../../lib/queries'
import type { DocumentKey, DocumentResponse } from '../../lib/types'

/** Minimal shape shared by projects, skills and collection entries. */
export interface Entry {
  id: string
  status: string
  hasUnpublishedChanges: boolean
  publishedAt: string | null
  deletedAt?: string | null
}

export interface PendingItem {
  key: string
  area: string
  label: string
  /** POST path (relative to /api) that publishes it. */
  path: string
  /** Never published before — publishing makes it visible for the first time. */
  firstPublish: boolean
  perms: Permission[]
}

export interface DocArea {
  kind: 'doc'
  key: DocumentKey
  title: string
  to: string
  site: boolean
  query: UseQueryResult<DocumentResponse<unknown>>
}

export interface ListArea {
  kind: 'list'
  key: string
  title: string
  to: string
  apiBase: string
  query: UseQueryResult<Entry[]>
  labelOf: (e: Entry) => string
}

export type Area = DocArea | ListArea

const str = (e: Entry, k: string) => {
  const v = (e as unknown as Record<string, unknown>)[k]
  return typeof v === 'string' ? v : ''
}
const joined = (...parts: string[]) => parts.filter(Boolean).join(' · ') || 'Untitled'

/** Loads every content area the Portfolio Editor summarises. */
export function usePortfolioData() {
  const docs: DocArea[] = [
    { kind: 'doc', key: 'profile', title: 'Profile', to: '/profile', site: false, query: useDocument<unknown>('profile') },
    { kind: 'doc', key: 'homepage', title: 'Homepage', to: '/homepage', site: true, query: useDocument<unknown>('homepage') },
    { kind: 'doc', key: 'appearance', title: 'Appearance', to: '/appearance', site: true, query: useDocument<unknown>('appearance') },
    { kind: 'doc', key: 'seo', title: 'SEO', to: '/seo', site: true, query: useDocument<unknown>('seo') },
  ]
  const useCol = (c: Collection) => useCollection(c) as unknown as UseQueryResult<Entry[]>
  const lists: ListArea[] = [
    { kind: 'list', key: 'projects', title: 'Projects', to: '/projects', apiBase: '/admin/projects', query: useProjects() as unknown as UseQueryResult<Entry[]>, labelOf: (e) => str(e, 'title') || 'Untitled project' },
    { kind: 'list', key: 'skills', title: 'Skills', to: '/skills', apiBase: '/admin/skills', query: useSkills() as unknown as UseQueryResult<Entry[]>, labelOf: (e) => str(e, 'name') || 'Untitled skill' },
    { kind: 'list', key: 'experience', title: 'Experience', to: '/experience', apiBase: '/admin/experience', query: useCol('experience'), labelOf: (e) => joined(str(e, 'position'), str(e, 'organization')) },
    { kind: 'list', key: 'education', title: 'Education', to: '/education', apiBase: '/admin/education', query: useCol('education'), labelOf: (e) => joined(str(e, 'degree'), str(e, 'institution')) },
    { kind: 'list', key: 'certifications', title: 'Certifications', to: '/education', apiBase: '/admin/certifications', query: useCol('certifications'), labelOf: (e) => joined(str(e, 'name'), str(e, 'issuer')) },
    { kind: 'list', key: 'achievements', title: 'Achievements', to: '/education', apiBase: '/admin/achievements', query: useCol('achievements'), labelOf: (e) => str(e, 'title') || 'Untitled achievement' },
  ]
  return { docs, lists }
}

export function liveEntries(q: UseQueryResult<Entry[]>) {
  return (q.data ?? []).filter((e) => !e.deletedAt)
}

export function countsOf(items: Entry[]) {
  const c = { total: items.length, published: 0, draft: 0, archived: 0, pending: 0 }
  for (const e of items) {
    if (e.status === 'PUBLISHED') c.published++
    else if (e.status === 'ARCHIVED') c.archived++
    else c.draft++
    if (e.status === 'PUBLISHED' && e.hasUnpublishedChanges) c.pending++
  }
  return c
}

/**
 * Everything that has changes waiting to go live: documents whose draft differs
 * from the published copy, published entries with edited drafts, and (opt-in)
 * drafts that were never published. Archived entries are never included.
 */
export function pendingItems({ docs, lists }: ReturnType<typeof usePortfolioData>): PendingItem[] {
  const out: PendingItem[] = []
  for (const d of docs) {
    const r = d.query.data
    if (!r?.hasUnpublishedChanges || r.draft == null) continue
    out.push({
      key: `doc:${d.key}`,
      area: d.title,
      label: `${d.title} document`,
      path: `/admin/documents/${d.key}/publish`,
      firstPublish: !r.published,
      perms: d.site ? ['content:publish', 'site:write'] : ['content:publish'],
    })
  }
  for (const l of lists) {
    for (const e of liveEntries(l.query)) {
      if (e.status === 'ARCHIVED' || !e.hasUnpublishedChanges) continue
      out.push({
        key: `${l.key}:${e.id}`,
        area: l.title,
        label: l.labelOf(e),
        path: `${l.apiBase}/${e.id}/publish`,
        firstPublish: e.status !== 'PUBLISHED',
        perms: ['content:publish'],
      })
    }
  }
  return out
}
