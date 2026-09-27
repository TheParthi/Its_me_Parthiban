import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { siteSettingsSchema, type SiteSettings } from '@pg/shared'
import { apiRaw, get, put } from '../../lib/api'
import { qk } from '../../lib/queries'
import { scopeErrors, serverErrors, zodErrors, type FieldErrors } from '../../lib/forms'
import type { SystemInfo } from '../../lib/types'

export function useSettings() {
  return useQuery({ queryKey: qk.settings, queryFn: ({ signal }) => get<SiteSettings>('/admin/settings', undefined, signal) })
}

export function useSystemInfo() {
  return useQuery({ queryKey: qk.system, queryFn: ({ signal }) => get<SystemInfo>('/admin/settings/system', undefined, signal) })
}

type Section = keyof SiteSettings

/**
 * Local draft for one settings section. Saving sends the FULL settings
 * object (latest server copy + this section), validated with the shared schema.
 */
export function useSettingsSection<K extends Section>(key: K) {
  const qc = useQueryClient()
  const q = useSettings()
  const server = q.data?.[key]
  const [draft, setDraft] = useState<SiteSettings[K] | undefined>(server)
  const [errors, setErrors] = useState<FieldErrors>({})

  const serverJson = JSON.stringify(server ?? null)
  useEffect(() => {
    if (server) setDraft(server)
    // Reset only when the server copy actually changes.
  }, [serverJson])

  const dirty = useMemo(() => !!draft && JSON.stringify(draft) !== serverJson, [draft, serverJson])

  const set = useCallback(<F extends keyof SiteSettings[K]>(field: F, v: SiteSettings[K][F]) => {
    setDraft((d) => (d ? { ...d, [field]: v } : d))
    setErrors((e) => {
      if (!e[String(field)]) return e
      const n = { ...e }
      delete n[String(field)]
      return n
    })
  }, [])

  const m = useMutation({
    mutationFn: (body: SiteSettings) => put<SiteSettings>('/admin/settings', body),
    onSuccess: (data) => qc.setQueryData(qk.settings, data),
  })

  /** Resolves true on success; field errors are set on validation failure. */
  const save = async (): Promise<boolean> => {
    if (!q.data || !draft) return false
    const body = { ...q.data, [key]: draft } as SiteSettings
    const errs = zodErrors(siteSettingsSchema, body)
    if (errs) {
      setErrors(scopeErrors(errs, key))
      return false
    }
    try {
      await m.mutateAsync(body)
      setErrors({})
      return true
    } catch (e) {
      const se = serverErrors(e)
      if (se) {
        setErrors(scopeErrors(se, key))
        return false
      }
      throw e
    }
  }

  return { query: q, draft, set, dirty, errors, save, saving: m.isPending, reset: () => (server ? setDraft(server) : undefined) }
}

export function useBackupExport() {
  return useMutation({
    mutationFn: async () => {
      const res = await apiRaw('/admin/backup/export')
      return res.blob()
    },
  })
}

export interface RestoreResult {
  ok: true
  counts: Record<string, number>
}

export function useBackupRestore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: unknown) => {
      const res = await apiRaw('/admin/backup/restore', { method: 'POST', body, query: { confirm: 'RESTORE' } })
      return (await res.json()) as RestoreResult
    },
    onSuccess: () => qc.invalidateQueries(),
  })
}
