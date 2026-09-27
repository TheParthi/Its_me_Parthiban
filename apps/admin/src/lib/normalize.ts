/**
 * Tolerant readers for endpoints whose exact envelope may vary while the API
 * is being finished (array vs `{ items, total }`, flattened vs `{ draft }`).
 * They never invent data — unknown shapes become empty lists.
 */
import type { Journey, LiveSession, LiveVisitors, Paged, SearchGroup, SearchHit } from './types'
import { SEARCH_GROUPS } from './types'

type Rec = Record<string, unknown>
const isRec = (v: unknown): v is Rec => !!v && typeof v === 'object' && !Array.isArray(v)

export function asList<T>(r: unknown): T[] {
  if (Array.isArray(r)) return r as T[]
  if (isRec(r)) {
    for (const k of ['items', 'data', 'results', 'rows', 'sessions']) if (Array.isArray(r[k])) return r[k] as T[]
  }
  return []
}

export function asPaged<T>(r: unknown): Paged<T> {
  const items = asList<T>(r)
  const total = isRec(r) && typeof r.total === 'number' ? r.total : items.length
  return { items, total }
}

/** Admin entities may come back as `{ id, status, draft: {...} }`; flatten the draft in. */
export function flattenAdmin<T>(raw: unknown): T {
  if (!isRec(raw)) return raw as T
  const { draft, published: _published, ...meta } = raw
  if (isRec(draft)) return { ...draft, ...meta } as T
  return raw as T
}

export function flattenList<T>(r: unknown): T[] {
  return asList<unknown>(r).map((x) => flattenAdmin<T>(x))
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v ? v : undefined
}

export function normalizeSearch(r: unknown): SearchHit[] {
  if (!isRec(r)) return []
  const out: SearchHit[] = []
  for (const g of SEARCH_GROUPS) {
    for (const item of asList<unknown>(r[g])) {
      if (!isRec(item)) continue
      const flat = flattenAdmin<Rec>(item)
      const id = str(flat.id) ?? String(flat.id ?? '')
      const title =
        str(flat.title) ?? str(flat.name) ?? str(flat.position) ?? str(flat.subject) ?? str(flat.fileName) ?? str(flat.originalName) ?? str(flat.email) ?? id
      const subtitle =
        str(flat.subtitle) ??
        (g === 'experience'
          ? str(flat.organization)
          : g === 'messages'
            ? str(flat.email) ?? str(flat.name)
            : g === 'users'
              ? str(flat.email)
              : g === 'projects'
                ? str(flat.slug)
                : g === 'media'
                  ? str(flat.mimeType)
                  : str(flat.category))
      out.push({ id, title, subtitle, group: g as SearchGroup })
    }
  }
  return out
}

export function normalizeJourneys(r: unknown): Journey[] {
  return asList<unknown>(isRec(r) && Array.isArray(r.journeys) ? r.journeys : r).flatMap((j) => {
    if (!isRec(j)) return []
    const raw = j.steps ?? j.path ?? j.paths ?? j.key
    const steps = Array.isArray(raw) ? raw.map(String) : typeof raw === 'string' ? raw.split(/\s*(?:→|->|>)\s*/).filter(Boolean) : []
    const sessions = Number(j.sessions ?? j.count ?? j.value ?? 0)
    return steps.length ? [{ steps, sessions }] : []
  })
}

export function normalizeLive(r: unknown): LiveVisitors {
  const sessions = asList<LiveSession>(r)
  const rec = isRec(r) ? r : {}
  const count = typeof rec.count === 'number' ? rec.count : typeof rec.active === 'number' ? rec.active : sessions.length
  const windowMinutes = typeof rec.windowMinutes === 'number' ? rec.windowMinutes : typeof rec.window === 'number' ? rec.window : null
  const note = typeof rec.note === 'string' ? rec.note : null
  return { count, windowMinutes, sessions, note }
}
