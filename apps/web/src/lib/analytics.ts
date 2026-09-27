import type { AnalyticsBatch, AnalyticsEvent, EventType } from '@pg/shared'
import { useSyncExternalStore } from 'react'
import { API_URL, type PublicSettings } from '../content/api'

// First-party, cookie-less analytics. Runs only when an API is configured,
// analytics is enabled in the CMS settings, the page is not a preview, and
// (when configured) the browser does not send Do Not Track / GPC.
//
// Privacy: a random per-tab session id (sessionStorage); a persistent visitor
// id (localStorage) only after consent when consent is required. Events never
// carry form contents, email addresses or free text.

type Status = 'pending' | 'on' | 'off'
export type Consent = 'granted' | 'denied' | 'unset'

const FLUSH_MS = 5000
const HEARTBEAT_S = 15
const MAX_BATCH = 25
const MAX_QUEUE = 200
const K = { sid: 'pg:sid', vid: 'pg:vid', consent: 'pg:consent', seen: 'pg:seen-sections' }

const store = {
  get(s: Storage | undefined, k: string) {
    try {
      return s?.getItem(k) ?? null
    } catch {
      return null
    }
  },
  set(s: Storage | undefined, k: string, v: string) {
    try {
      s?.setItem(k, v)
    } catch {
      /* storage unavailable */
    }
  },
  del(s: Storage | undefined, k: string) {
    try {
      s?.removeItem(k)
    } catch {
      /* storage unavailable */
    }
  },
}
const ss = () => (typeof window === 'undefined' ? undefined : (() => { try { return window.sessionStorage } catch { return undefined } })())
const ls = () => (typeof window === 'undefined' ? undefined : (() => { try { return window.localStorage } catch { return undefined } })())

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = new Uint8Array(16)
  crypto.getRandomValues(b)
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

let status: Status = API_URL ? 'pending' : 'off'
let requireConsent = true
let pending: AnalyticsEvent[] = []
let queue: AnalyticsEvent[] = []
let sessionId = ''
let visitorId: string | null = null
let landing: Pick<AnalyticsBatch, 'referrer' | 'utm'> = {}
let consent: Consent = 'unset'
let showPrompt = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function captureLanding() {
  const ref = document.referrer
  try {
    if (ref && new URL(ref).origin !== location.origin) landing.referrer = ref.slice(0, 500)
  } catch {
    /* malformed referrer */
  }
  const q = new URLSearchParams(location.search)
  const utm = {
    source: q.get('utm_source')?.slice(0, 80) || undefined,
    medium: q.get('utm_medium')?.slice(0, 80) || undefined,
    campaign: q.get('utm_campaign')?.slice(0, 120) || undefined,
  }
  if (utm.source || utm.medium || utm.campaign) landing.utm = utm
}

const path = () => {
  const p = location.pathname || '/'
  return (p.startsWith('/') ? p : `/${p}`).replace(/\s/g, '').slice(0, 200)
}

const cleanTarget = (t: string | undefined) => t?.replace(/[^a-zA-Z0-9_.:-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || undefined
const cleanSlug = (t: string | undefined) => (t && /^[a-z0-9-]{1,80}$/.test(t) ? t : undefined)
const cleanSection = (t: string | undefined) => (t && /^[a-z0-9-]{1,40}$/.test(t) ? t : undefined)

/** Record an event. Safe to call at any time; dropped when analytics is off. */
export function track(type: EventType, extra: { section?: string; projectSlug?: string; target?: string; value?: number } = {}) {
  if (status === 'off') return
  const ev: AnalyticsEvent = {
    type,
    path: path(),
    ts: Date.now(),
    section: cleanSection(extra.section),
    projectSlug: cleanSlug(extra.projectSlug),
    target: cleanTarget(extra.target),
    value: extra.value !== undefined ? Math.max(0, Math.min(86400, Math.round(extra.value))) : undefined,
  }
  const q = status === 'pending' ? pending : queue
  if (q.length < MAX_QUEUE) q.push(ev)
}

function batch(events: AnalyticsEvent[]): string {
  const body: AnalyticsBatch = {
    sessionId,
    visitorId,
    ...landing,
    screen: { w: Math.min(10000, window.screen?.width ?? 0), h: Math.min(10000, window.screen?.height ?? 0) },
    events,
  }
  return JSON.stringify(body)
}

const endpoint = () => `${API_URL}/api/analytics/events`

/** Sends queued events. `beacon` for page-hide, where fetch may be cancelled. */
function flush(beacon = false) {
  if (status !== 'on' || !queue.length) return
  while (queue.length) {
    const body = batch(queue.splice(0, MAX_BATCH))
    // text/plain keeps this a "simple" CORS request: no preflight.
    if (beacon && typeof navigator.sendBeacon === 'function') {
      if (navigator.sendBeacon(endpoint(), new Blob([body], { type: 'text/plain;charset=UTF-8' }))) continue
    }
    fetch(endpoint(), {
      method: 'POST',
      body,
      keepalive: true,
      credentials: 'omit',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    }).catch(() => {
      /* analytics is best effort */
    })
  }
}

function ensureVisitorId() {
  const existing = store.get(ls(), K.vid)
  if (existing && UUID_RE.test(existing)) visitorId = existing
  else {
    visitorId = uuid()
    store.set(ls(), K.vid, visitorId)
  }
}

/**
 * Decides whether analytics runs, once public settings are known.
 * Queued events (e.g. the landing PAGE_VIEW) are sent or discarded.
 */
export function configureAnalytics(settings: PublicSettings | null, opts: { preview: boolean }) {
  if (status !== 'pending') return
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean }
  const dnt = nav.doNotTrack === '1' || (window as Window & { doNotTrack?: string }).doNotTrack === '1' || nav.globalPrivacyControl === true
  const a = settings?.analytics
  if (!API_URL || opts.preview || !a?.enabled || (a.respectDoNotTrack && dnt)) {
    status = 'off'
    pending = []
    emit()
    return
  }
  requireConsent = a.requireConsent
  const stored = store.get(ls(), K.consent)
  consent = stored === 'granted' || stored === 'denied' ? stored : 'unset'
  if (!requireConsent || consent === 'granted') ensureVisitorId()
  else if (consent === 'denied') store.del(ls(), K.vid)
  showPrompt = requireConsent && consent === 'unset'

  const sid = store.get(ss(), K.sid)
  sessionId = sid && UUID_RE.test(sid) ? sid : uuid()
  store.set(ss(), K.sid, sessionId)

  status = 'on'
  queue.push(...pending)
  pending = []
  emit()
  flush()
}

export function setConsent(choice: 'granted' | 'denied') {
  consent = choice
  showPrompt = false
  store.set(ls(), K.consent, choice)
  if (choice === 'granted') ensureVisitorId()
  else {
    visitorId = null
    store.del(ls(), K.vid)
  }
  emit()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
/** True while the consent bar should be shown. */
export const useConsentPrompt = () => useSyncExternalStore(subscribe, () => showPrompt, () => false)

// ---------------------------------------------------------------------------
// Automatic tracking: page view, section views, heartbeats, tagged clicks.
// ---------------------------------------------------------------------------

/**
 * Elements can opt into click tracking declaratively:
 *   data-ev="CTA_CLICK" data-ev-target="hero-explore" [data-ev-project="slug"]
 */
function onClick(e: MouseEvent) {
  const el = (e.target as Element | null)?.closest?.<HTMLElement>('[data-ev]')
  if (!el) return
  const type = el.dataset.ev as EventType
  track(type, { target: el.dataset.evTarget, projectSlug: el.dataset.evProject, section: el.closest('section[id]')?.id })
}

function seenSections(): Set<string> {
  try {
    return new Set(JSON.parse(store.get(ss(), K.seen) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

let started = false
let landed = false

/** Starts listeners once; returns a cleanup. */
export function startAnalytics(): () => void {
  if (started || !API_URL) return () => {}
  started = true
  if (!landed) {
    landed = true
    captureLanding()
    track('PAGE_VIEW')
  }

  const seen = seenSections()
  const since = new Map<string, number>()
  // A section counts as viewed when ≥50% of it (or, for tall sections, of the
  // viewport) has been visible for one continuous second.
  const checkSections = () => {
    if (status !== 'on' || document.visibilityState !== 'visible') return
    const vh = window.innerHeight
    const now = performance.now()
    document.querySelectorAll<HTMLElement>('main > section[id]').forEach((el) => {
      const id = el.id
      if (seen.has(id)) return
      const r = el.getBoundingClientRect()
      const vis = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0))
      const ok = r.height > 0 && (vis / r.height >= 0.5 || vis / vh >= 0.5)
      if (!ok) {
        since.delete(id)
        return
      }
      const t0 = since.get(id)
      if (t0 === undefined) since.set(id, now)
      else if (now - t0 >= 1000) {
        seen.add(id)
        since.delete(id)
        store.set(ss(), K.seen, JSON.stringify([...seen]))
        track('SECTION_VIEW', { section: id, value: 1 })
      }
    })
  }

  const sectionTimer = window.setInterval(checkSections, 250)
  const flushTimer = window.setInterval(() => flush(), FLUSH_MS)
  const heartbeat = window.setInterval(() => {
    if (status === 'on' && document.visibilityState === 'visible') track('HEARTBEAT', { value: HEARTBEAT_S })
  }, HEARTBEAT_S * 1000)
  const onVis = () => {
    if (document.visibilityState === 'hidden') flush(true)
  }
  const onHide = () => flush(true)

  document.addEventListener('click', onClick, { capture: true })
  document.addEventListener('visibilitychange', onVis)
  window.addEventListener('pagehide', onHide)

  return () => {
    started = false
    clearInterval(sectionTimer)
    clearInterval(flushTimer)
    clearInterval(heartbeat)
    document.removeEventListener('click', onClick, { capture: true })
    document.removeEventListener('visibilitychange', onVis)
    window.removeEventListener('pagehide', onHide)
  }
}
