import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ZodType } from 'zod'
import { ApiError } from './api'

/** Field errors keyed by dotted path, e.g. `hero.roles.0` or `links.github`. */
export type FieldErrors = Record<string, string>

export function zodErrors(schema: ZodType, value: unknown): FieldErrors | null {
  const r = schema.safeParse(value)
  if (r.success) return null
  const out: FieldErrors = {}
  for (const i of r.error.issues) {
    const k = i.path.map(String).join('.') || '_form'
    out[k] ??= i.message
  }
  return out
}

/** Map a 400 `{ issues }` response onto field errors. */
export function serverErrors(err: unknown): FieldErrors | null {
  if (!(err instanceof ApiError) || !err.issues.length) return null
  const out: FieldErrors = {}
  for (const i of err.issues) out[i.path || '_form'] ??= i.message
  return out
}

/** Errors under a prefix, with the prefix removed (for nested editors). */
export function scopeErrors(errors: FieldErrors, prefix: string): FieldErrors {
  const out: FieldErrors = {}
  const p = `${prefix}.`
  for (const [k, v] of Object.entries(errors)) {
    if (k === prefix) out._self = v
    else if (k.startsWith(p)) out[k.slice(p.length)] = v
  }
  return out
}

export function firstError(errors: FieldErrors | null | undefined): string | null {
  if (!errors) return null
  const [k, v] = Object.entries(errors)[0] ?? []
  if (!k) return null
  return k === '_form' ? v! : `${k}: ${v}`
}

// ---------------------------------------------------------------------------
// Immutable deep set by path
// ---------------------------------------------------------------------------

export function setIn<T>(obj: T, path: (string | number)[], value: unknown): T {
  if (!path.length) return value as T
  const [head, ...rest] = path
  const src = (obj ?? (typeof head === 'number' ? [] : {})) as Record<string | number, unknown>
  const copy = (Array.isArray(src) ? [...src] : { ...src }) as Record<string | number, unknown>
  copy[head] = setIn(src[head], rest, value)
  return copy as T
}

// ---------------------------------------------------------------------------
// Draft form state with dirty tracking
// ---------------------------------------------------------------------------

export interface DraftForm<T> {
  value: T
  set: (path: (string | number)[], v: unknown) => void
  replace: (v: T) => void
  reset: (v: T) => void
  dirty: boolean
  errors: FieldErrors
  setErrors: (e: FieldErrors) => void
  /** Validate with the schema; returns parsed data or null and sets errors. */
  validate: () => T | null
}

/**
 * Local editable copy of a server document. `reset` marks a new clean
 * baseline (after load or save). Dirty = differs from the baseline.
 */
export function useDraftForm<T>(initial: T | undefined, schema: ZodType): DraftForm<T | undefined> {
  const [value, setValue] = useState<T | undefined>(initial)
  const [baseline, setBaseline] = useState<string>(() => JSON.stringify(initial ?? null))
  const [errors, setErrors] = useState<FieldErrors>({})
  const loaded = useRef(initial !== undefined)

  useEffect(() => {
    if (initial !== undefined && !loaded.current) {
      loaded.current = true
      setValue(initial)
      setBaseline(JSON.stringify(initial))
    }
  }, [initial])

  const set = useCallback((path: (string | number)[], v: unknown) => {
    setValue((prev) => setIn(prev, path, v))
    const key = path.join('.')
    setErrors((e) => {
      if (!Object.keys(e).some((k) => k === key || k.startsWith(`${key}.`))) return e
      const next = { ...e }
      for (const k of Object.keys(next)) if (k === key || k.startsWith(`${key}.`)) delete next[k]
      return next
    })
  }, [])

  const replace = useCallback((v: T | undefined) => setValue(v), [])
  const reset = useCallback((v: T | undefined) => {
    setValue(v)
    setBaseline(JSON.stringify(v ?? null))
    setErrors({})
  }, [])

  const dirty = useMemo(() => value !== undefined && JSON.stringify(value) !== baseline, [value, baseline])

  const validate = useCallback((): T | undefined | null => {
    const r = schema.safeParse(value)
    if (r.success) {
      setErrors({})
      return r.data as T
    }
    const out: FieldErrors = {}
    for (const i of r.error.issues) out[i.path.map(String).join('.') || '_form'] ??= i.message
    setErrors(out)
    return null
  }, [schema, value])

  return { value, set, replace, reset, dirty, errors, setErrors, validate }
}

/** Warn before leaving the page with unsaved edits. */
export function useUnsavedWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])
}

export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}
