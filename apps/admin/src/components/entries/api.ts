/**
 * Generic hooks for draft/publish "entry" collections (skills, experience,
 * education, certifications, achievements). They all share the same routes:
 *   GET    {base}?trash=true
 *   POST   {base}                  create (draft)
 *   PATCH  {base}/:id              update draft
 *   POST   {base}/:id/publish|unpublish|restore
 *   DELETE {base}/:id[?permanent=true]
 *   POST   {base}/reorder          { ids }
 */
import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { del, get, patch, post } from '../../lib/api'
import { flattenAdmin, flattenList } from '../../lib/normalize'
import type { AdminMeta } from '../../lib/types'

export interface EntrySource {
  /** API base path, e.g. `/admin/experience`. */
  base: string
  /** Query key of the live list (`qk.skills`, `qk.collection('experience')`). */
  key: QueryKey
}

export const trashKey = (key: QueryKey) => [...key, 'trash'] as const

/** Items currently in the trash (the live list comes from the shared hooks). */
export function useTrashedEntries<T extends AdminMeta>(src: EntrySource, enabled = true) {
  return useQuery({
    queryKey: trashKey(src.key),
    enabled,
    queryFn: async ({ signal }) => flattenList<T>(await get<unknown>(src.base, { trash: true }, signal)),
  })
}

export function useEntryMutations<T extends AdminMeta>(src: EntrySource) {
  const qc = useQueryClient()
  // Prefix match refreshes the live list, the trash list and dependants.
  const refresh = () => qc.invalidateQueries({ queryKey: src.key })
  const one = (r: unknown) => flattenAdmin<T>(r)

  const create = useMutation({
    mutationFn: async (body: unknown) => one(await post<unknown>(src.base, body)),
    onSuccess: refresh,
  })
  const update = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: unknown }) => one(await patch<unknown>(`${src.base}/${id}`, body)),
    onSuccess: refresh,
  })
  const publish = useMutation({
    mutationFn: async (id: string) => one(await post<unknown>(`${src.base}/${id}/publish`)),
    onSuccess: refresh,
  })
  const unpublish = useMutation({
    mutationFn: async (id: string) => one(await post<unknown>(`${src.base}/${id}/unpublish`)),
    onSuccess: refresh,
  })
  const trash = useMutation({
    mutationFn: (id: string) => del<{ ok: boolean }>(`${src.base}/${id}`),
    onSuccess: refresh,
  })
  const restore = useMutation({
    mutationFn: async (id: string) => one(await post<unknown>(`${src.base}/${id}/restore`)),
    onSuccess: refresh,
  })
  const destroy = useMutation({
    mutationFn: (id: string) => del<{ ok: boolean }>(`${src.base}/${id}`, { permanent: true }),
    onSuccess: refresh,
  })
  const reorder = useMutation({
    mutationFn: (ids: string[]) => post<{ ok: boolean }>(`${src.base}/reorder`, { ids }),
    onMutate: async (ids: string[]) => {
      // Optimistic: reorder the cached live list immediately.
      await qc.cancelQueries({ queryKey: src.key, exact: true })
      const prev = qc.getQueryData<T[]>(src.key)
      if (prev) {
        const pos = new Map(ids.map((id, i) => [id, i]))
        const next = [...prev]
          .map((x) => (pos.has(x.id) ? { ...x, order: pos.get(x.id)! } : x))
          .sort((a, b) => a.order - b.order)
        qc.setQueryData(src.key, next)
      }
      return { prev }
    },
    onError: (_e, _ids, ctx) => {
      if (ctx?.prev) qc.setQueryData(src.key, ctx.prev)
    },
    onSettled: refresh,
  })

  return { create, update, publish, unpublish, trash, restore, destroy, reorder }
}

export type EntryMutations<T extends AdminMeta> = ReturnType<typeof useEntryMutations<T>>

const META_KEYS = ['id', 'order', 'status', 'hasUnpublishedChanges', 'publishedAt', 'publishAt', 'updatedAt', 'deletedAt', 'createdAt'] as const

/** The editable draft fields of an admin entry (meta stripped). */
export function toDraft<D>(entry: object): D {
  const out: Record<string, unknown> = { ...entry }
  for (const k of META_KEYS) delete out[k]
  return out as D
}
