import type { AuthUser, LoginResponse } from '@pg/shared'

/**
 * Fetch wrapper for the admin API.
 *
 * - The access token lives in memory only (never localStorage).
 * - A 401 triggers ONE single-flight refresh (shared promise), coordinated
 *   across tabs: navigator.locks serialises rotation, and a BroadcastChannel
 *   hands the fresh token to other tabs so they reuse it instead of rotating
 *   the refresh cookie again.
 * - 403 `REAUTH_REQUIRED` asks the registered handler (a password modal) to
 *   confirm, then retries the original request with the new token.
 */

export const API_BASE = '/api'
const CSRF_HEADER = { 'X-Requested-With': 'pg-admin' }

export interface ApiIssue {
  path: string
  message: string
}

export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly issues: ApiIssue[]
  readonly body: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
    const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
    this.code = typeof b.code === 'string' ? b.code : undefined
    this.issues = Array.isArray(b.issues)
      ? (b.issues as unknown[]).flatMap((i) => {
          if (!i || typeof i !== 'object') return []
          const r = i as Record<string, unknown>
          const path = Array.isArray(r.path) ? r.path.join('.') : String(r.path ?? '')
          return [{ path, message: String(r.message ?? 'Invalid value') }]
        })
      : []
  }
}

export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof ApiError) {
    if (err.status === 0) return 'Cannot reach the server. Check your connection.'
    if (err.issues.length) return `${err.message}: ${err.issues[0].path ? `${err.issues[0].path} — ` : ''}${err.issues[0].message}`
    return err.message || fallback
  }
  if (err instanceof Error) return err.message || fallback
  return fallback
}

type OkLogin = Extract<LoginResponse, { status: 'ok' }>

// ---------------------------------------------------------------------------
// Session state (module-level so the fetch wrapper and React share it)
// ---------------------------------------------------------------------------

let accessToken: string | null = null
type SessionListener = (user: AuthUser | null) => void
const listeners = new Set<SessionListener>()

export function onSession(fn: SessionListener) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

function emit(user: AuthUser | null) {
  for (const l of listeners) l(user)
}

export function hasToken() {
  return accessToken !== null
}

/** Store a fresh session, notify React and (optionally) other tabs. */
export function acceptSession(r: OkLogin, broadcast = true) {
  accessToken = r.accessToken
  lastTokenAt = Date.now()
  emit(r.user)
  if (broadcast) channel?.postMessage({ type: 'session', payload: r } satisfies ChannelMsg)
}

export function clearSession(broadcast = true) {
  accessToken = null
  emit(null)
  if (broadcast) channel?.postMessage({ type: 'logout' } satisfies ChannelMsg)
}

// ---------------------------------------------------------------------------
// Cross-tab coordination
// ---------------------------------------------------------------------------

type ChannelMsg = { type: 'session'; payload: OkLogin } | { type: 'logout' }

const channel: BroadcastChannel | null = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('pg-admin-auth') : null
/** When this tab last received a token (own refresh or from another tab). */
let lastTokenAt = 0

channel?.addEventListener('message', (e: MessageEvent<ChannelMsg>) => {
  const msg = e.data
  if (msg?.type === 'session') acceptSession(msg.payload, false)
  else if (msg?.type === 'logout') clearSession(false)
})

let refreshing: Promise<boolean> | null = null

/** 'shared' = another tab rotated and its token already arrived on the channel. */
async function callRefresh(): Promise<OkLogin | 'shared' | null> {
  const res = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include', headers: CSRF_HEADER }).catch(() => null)
  if (!res) throw new ApiError(0, 'Network error')
  if (res.ok) return (await res.json()) as OkLogin
  const body = await res.json().catch(() => null)
  const msg = String((body as { message?: unknown } | null)?.message ?? '')
  // Another tab rotated the cookie a moment ago; its token arrives on the channel.
  if (res.status === 401 && /just refreshed/i.test(msg)) return (await waitForBroadcast(2500)) ? 'shared' : null
  return null
}

function waitForBroadcast(ms: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (!channel) return resolve(false)
    const t = setTimeout(() => {
      channel.removeEventListener('message', on)
      resolve(false)
    }, ms)
    const on = (e: MessageEvent<ChannelMsg>) => {
      if (e.data?.type === 'session') {
        clearTimeout(t)
        channel.removeEventListener('message', on)
        resolve(true)
      }
    }
    channel.addEventListener('message', on)
  })
}

/**
 * Rotate the refresh cookie and obtain a new access token. Concurrent callers
 * in this tab share one promise; across tabs a Web Lock makes only one tab
 * rotate at a time — tabs that waited reuse the token broadcast meanwhile.
 * Resolves true when this tab holds a valid token afterwards.
 */
export function refreshSession(): Promise<boolean> {
  if (refreshing) return refreshing
  const startedAt = Date.now()
  const run = async (): Promise<boolean> => {
    // Another tab refreshed while we waited for the lock: reuse its token.
    if (lastTokenAt > startedAt && accessToken) return true
    const r = await callRefresh()
    if (r === 'shared') return true
    if (r) acceptSession(r)
    return !!r
  }
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  const attempt: Promise<boolean> = locks ? (locks.request('pg-admin-refresh', () => run()) as unknown as Promise<boolean>) : run()
  const p = attempt
    .catch((err: unknown) => {
      if (err instanceof ApiError && err.status === 0) throw err
      return false
    })
    .finally(() => {
      refreshing = null
    })
  refreshing = p
  return p
}

// ---------------------------------------------------------------------------
// Re-authentication (password prompt) hook
// ---------------------------------------------------------------------------

type ReauthHandler = () => Promise<boolean>
let reauthHandler: ReauthHandler | null = null
let reauthInFlight: Promise<boolean> | null = null

export function setReauthHandler(fn: ReauthHandler | null) {
  reauthHandler = fn
}

function requestReauth(): Promise<boolean> {
  if (!reauthHandler) return Promise.resolve(false)
  reauthInFlight ??= reauthHandler().finally(() => {
    reauthInFlight = null
  })
  return reauthInFlight
}

let unauthorizedHandler: (() => void) | null = null
export function setUnauthorizedHandler(fn: (() => void) | null) {
  unauthorizedHandler = fn
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

export type QueryValue = string | number | boolean | null | undefined
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, QueryValue>
  headers?: Record<string, string>
  signal?: AbortSignal
  /** Do not attach the token or attempt refresh (login, forgot password…). */
  anonymous?: boolean
  responseType?: 'json' | 'blob' | 'text'
}

export function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const qs = new URLSearchParams()
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue
      qs.set(k, String(v))
    }
  }
  const s = qs.toString()
  return `${API_BASE}${path}${s ? `?${s}` : ''}`
}

async function parseError(res: Response): Promise<ApiError> {
  let body: unknown = null
  const text = await res.text().catch(() => '')
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  let message = res.statusText || `Request failed (${res.status})`
  if (body && typeof body === 'object') {
    const m = (body as { message?: unknown }).message
    if (typeof m === 'string') message = m
    else if (Array.isArray(m)) message = m.join(', ')
  }
  if (res.status === 404 && message === 'Not Found') message = 'Not found — this feature may not be available on the server yet'
  return new ApiError(res.status, message, body)
}

async function send(path: string, o: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json', ...o.headers }
  let body: BodyInit | undefined
  if (o.body instanceof FormData || o.body instanceof Blob) body = o.body
  else if (o.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(o.body)
  }
  if (!o.anonymous && accessToken) headers.Authorization = `Bearer ${accessToken}`
  try {
    return await fetch(buildUrl(path, o.query), { method: o.method ?? 'GET', headers, body, credentials: 'include', signal: o.signal })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError(0, 'Cannot reach the server')
  }
}

const CREDENTIAL_CHECK = /^\/auth\/(reauth|change-password|2fa\/enable)$/
/** Messages the API's auth guard uses when the access token itself is the problem. */
const SESSION_401 = new Set(['Authentication required', 'Session expired', 'Session is no longer valid'])

export async function apiRaw(path: string, o: RequestOptions = {}): Promise<Response> {
  let res = await send(path, o)
  // On credential checks a 401 means "wrong password/code", not an expired
  // session — refreshing and retrying would just submit the attempt twice.
  if (res.status === 401 && CREDENTIAL_CHECK.test(path)) {
    const body = (await res.clone().json().catch(() => null)) as { message?: string } | null
    if (!SESSION_401.has(body?.message ?? '')) throw await parseError(res)
  }
  if (res.status === 401 && !o.anonymous) {
    const ok = await refreshSession() // a network failure propagates; it is not a logout
    if (!ok) {
      clearSession()
      unauthorizedHandler?.()
      throw await parseError(res)
    }
    res = await send(path, o)
  }
  if (res.status === 403 && !o.anonymous) {
    const clone = res.clone()
    const body = (await clone.json().catch(() => null)) as { code?: string } | null
    if (body?.code === 'REAUTH_REQUIRED') {
      const ok = await requestReauth()
      if (!ok) throw new ApiError(403, 'Password confirmation is required for this action', body)
      res = await send(path, o)
    }
  }
  if (!res.ok) throw await parseError(res)
  return res
}

export async function api<T = unknown>(path: string, o: RequestOptions = {}): Promise<T> {
  const res = await apiRaw(path, o)
  if (o.responseType === 'blob') return (await res.blob()) as T
  if (res.status === 204) return undefined as T
  const text = await res.text()
  if (o.responseType === 'text') return text as T
  if (!text) return undefined as T
  try {
    return JSON.parse(text) as T
  } catch {
    return text as T
  }
}

export const get = <T>(path: string, query?: Record<string, QueryValue>, signal?: AbortSignal) => api<T>(path, { query, signal })
export const post = <T>(path: string, body?: unknown, query?: Record<string, QueryValue>) => api<T>(path, { method: 'POST', body, query })
export const put = <T>(path: string, body?: unknown) => api<T>(path, { method: 'PUT', body })
export const patch = <T>(path: string, body?: unknown) => api<T>(path, { method: 'PATCH', body })
export const del = <T>(path: string, query?: Record<string, QueryValue>) => api<T>(path, { method: 'DELETE', query })

/** Current bearer token, for XHR uploads that need progress events. */
export function authHeader(): Record<string, string> {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
}

// ---------------------------------------------------------------------------
// Auth endpoints
// ---------------------------------------------------------------------------

export const authApi = {
  login: (email: string, password: string, remember: boolean) =>
    api<LoginResponse>('/auth/login', { method: 'POST', body: { email, password, remember }, anonymous: true }),
  verify2fa: (challengeId: string, code: string) =>
    api<LoginResponse>('/auth/2fa/verify', { method: 'POST', body: { challengeId, code }, anonymous: true }),
  logout: () => api('/auth/logout', { method: 'POST', headers: CSRF_HEADER, anonymous: true }),
  me: () => api<AuthUser>('/auth/me'),
  reauth: (password: string) => api<OkLogin>('/auth/reauth', { method: 'POST', body: { password } }),
  forgot: (email: string) => api<{ ok: true }>('/auth/forgot-password', { method: 'POST', body: { email }, anonymous: true }),
  reset: (token: string, password: string) => api<{ ok: true }>('/auth/reset-password', { method: 'POST', body: { token, password }, anonymous: true }),
  acceptInvite: (token: string, password: string) =>
    api<{ ok: true }>('/auth/accept-invite', { method: 'POST', body: { token, password }, anonymous: true }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api<{ ok: true }>('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),
  setup2fa: () => api<{ otpauth: string; qr: string; secret: string }>('/auth/2fa/setup', { method: 'POST' }),
  enable2fa: (code: string) => api<AuthUser>('/auth/2fa/enable', { method: 'POST', body: { code } }),
  disable2fa: () => api<AuthUser>('/auth/2fa/disable', { method: 'POST' }),
}

/** Called after reauth/2FA changes so React sees the updated user. */
export function updateUser(user: AuthUser) {
  emit(user)
}
