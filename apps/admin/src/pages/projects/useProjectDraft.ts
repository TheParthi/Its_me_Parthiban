import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { projectInputSchema, type ProjectInput } from '@pg/shared'
import { ApiError, patch } from '../../lib/api'
import { serverErrors, zodErrors, type FieldErrors } from '../../lib/forms'
import { useProject } from '../../lib/queries'
import { useProjectActions } from './projectApi'
import { changedKeys, toInput } from './projectModel'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'invalid'
const AUTOSAVE_MS = 1500

/**
 * Local draft of a project with debounced autosave: 1.5s after the last edit,
 * validates the whole draft and PATCHes only the changed top-level fields.
 */
export function useProjectDraft(id: string | undefined) {
  const project = useProject(id)
  const { update } = useProjectActions()
  const [value, setValue] = useState<ProjectInput | null>(null)
  const [baseline, setBaseline] = useState<ProjectInput | null>(null)
  const [serverErrs, setServerErrs] = useState<FieldErrors>({})
  const [state, setState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<unknown>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const valueRef = useRef(value)
  const baselineRef = useRef(baseline)
  const savingRef = useRef(false)
  const failedRef = useRef<ProjectInput | null>(null)
  const loadedId = useRef<string | null>(null)
  valueRef.current = value
  baselineRef.current = baseline

  const resetTo = useCallback((v: ProjectInput) => {
    setValue(v)
    setBaseline(v)
    valueRef.current = v
    baselineRef.current = v
    setServerErrs({})
    setState('idle')
  }, [])

  // Initialise once per project id (later refetches must not clobber edits).
  useEffect(() => {
    if (project.data && loadedId.current !== project.data.id) {
      loadedId.current = project.data.id
      resetTo(toInput(project.data))
    }
  }, [project.data, resetTo])

  const clientErrs = useMemo(() => (value ? zodErrors(projectInputSchema, value) ?? {} : {}), [value])
  const errors = useMemo(() => ({ ...clientErrs, ...serverErrs }), [clientErrs, serverErrs])
  const dirty = useMemo(() => !!value && !!baseline && changedKeys(value, baseline).length > 0, [value, baseline])
  const valid = Object.keys(clientErrs).length === 0

  const set = useCallback(<K extends keyof ProjectInput>(key: K, v: ProjectInput[K]) => {
    setValue((prev) => (prev ? { ...prev, [key]: v } : prev))
    setServerErrs((e) => {
      const hit = Object.keys(e).filter((k) => k === key || k.startsWith(`${String(key)}.`))
      if (!hit.length) return e
      const next = { ...e }
      for (const k of hit) delete next[k]
      return next
    })
  }, [])

  /** Map an API error's issues (or a 409 slug clash) onto fields. */
  const applyServerError = useCallback((err: unknown) => {
    const fe = serverErrors(err)
    if (fe) setServerErrs(fe)
    else if (err instanceof ApiError && err.status === 409 && /slug/i.test(err.message)) setServerErrs({ slug: err.message })
    return !!fe
  }, [])

  const inFlight = useRef<Promise<boolean> | null>(null)

  /** Save changed fields now. Resolves true when nothing is left unsaved. */
  const save = useCallback(async (): Promise<boolean> => {
    if (inFlight.current) await inFlight.current
    const p = saveOnce()
    inFlight.current = p
    try {
      return await p
    } finally {
      if (inFlight.current === p) inFlight.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, update])

  const saveOnce = async (): Promise<boolean> => {
    const snapshot = valueRef.current
    const base = baselineRef.current
    if (!id || !snapshot || !base) return false
    const keys = changedKeys(snapshot, base)
    if (!keys.length) return true
    const parsed = projectInputSchema.safeParse(snapshot)
    if (!parsed.success) {
      setState('invalid')
      return false
    }
    const body: Partial<ProjectInput> = {}
    for (const k of keys) (body as Record<string, unknown>)[k] = parsed.data[k]
    savingRef.current = true
    setState('saving')
    try {
      await update.mutateAsync({ id, body })
      baselineRef.current = snapshot
      setBaseline(snapshot)
      failedRef.current = null
      setSaveError(null)
      setSavedAt(Date.now())
      setState('saved')
      return changedKeys(valueRef.current ?? snapshot, snapshot).length === 0
    } catch (err) {
      failedRef.current = snapshot
      setSaveError(err)
      applyServerError(err)
      setState('error')
      return false
    } finally {
      savingRef.current = false
    }
  }

  // Debounced autosave. Skips a draft that just failed until it changes.
  const saving = state === 'saving'
  useEffect(() => {
    if (!dirty || saving || !valid || failedRef.current === value) return
    const t = setTimeout(() => void save(), AUTOSAVE_MS)
    return () => clearTimeout(t)
  }, [value, dirty, saving, valid, save])

  useEffect(() => {
    if (dirty && !valid && state !== 'saving') setState('invalid')
    else if (valid && state === 'invalid') setState('idle')
  }, [dirty, valid, state])

  // Best-effort flush when the editor unmounts with pending valid edits.
  useEffect(
    () => () => {
      const v = valueRef.current
      const b = baselineRef.current
      if (!id || !v || !b || savingRef.current) return
      const keys = changedKeys(v, b)
      const parsed = projectInputSchema.safeParse(v)
      if (!keys.length || !parsed.success) return
      const body: Record<string, unknown> = {}
      for (const k of keys) body[k] = parsed.data[k]
      void patch(`/admin/projects/${id}`, body).catch(() => undefined)
    },
    [id],
  )

  const reload = useCallback(async () => {
    const r = await project.refetch()
    if (r.data) resetTo(toInput(r.data))
  }, [project, resetTo])

  const discard = useCallback(() => {
    if (baselineRef.current) resetTo(baselineRef.current)
  }, [resetTo])

  return { project, value, set, errors, dirty, valid, state, saveError, savedAt, save, reload, discard, applyServerError }
}
