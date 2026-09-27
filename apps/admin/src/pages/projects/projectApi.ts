import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ProjectAdmin, ProjectInput } from '@pg/shared'
import { del, patch, post } from '../../lib/api'
import { flattenAdmin } from '../../lib/normalize'
import { invalidateProjects, qk } from '../../lib/queries'

const base = (id: string) => `/admin/projects/${id}`
const admin = async (p: Promise<unknown>) => flattenAdmin<ProjectAdmin>(await p)

/** Mutations for projects; each refreshes the list and the project cache. */
export function useProjectActions() {
  const qc = useQueryClient()
  const done = (p?: ProjectAdmin | { id?: string } | null, id?: string) => {
    const pid = (p && 'id' in p && p.id) || id
    if (p && 'status' in p) qc.setQueryData(qk.project(p.id), p)
    invalidateProjects(qc, pid || undefined)
  }

  const create = useMutation({
    mutationFn: (body: ProjectInput) => admin(post('/admin/projects', body)),
    onSuccess: (p) => done(p),
  })
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<ProjectInput> }) => admin(patch(base(id), body)),
    onSuccess: (p) => done(p),
  })
  const duplicate = useMutation({
    mutationFn: (id: string) => admin(post(`${base(id)}/duplicate`)),
    onSuccess: (p) => done(p),
  })
  const publish = useMutation({
    mutationFn: ({ id, at }: { id: string; at?: string }) => admin(post(`${base(id)}/publish`, at ? { at } : {})),
    onSuccess: (p) => done(p),
  })
  const unpublish = useMutation({
    mutationFn: (id: string) => admin(post(`${base(id)}/unpublish`)),
    onSuccess: (p) => done(p),
  })
  const archive = useMutation({
    mutationFn: (id: string) => admin(post(`${base(id)}/archive`)),
    onSuccess: (p) => done(p),
  })
  const restore = useMutation({
    mutationFn: (id: string) => admin(post(`${base(id)}/restore`)),
    onSuccess: (p) => done(p),
  })
  const remove = useMutation({
    mutationFn: ({ id, permanent }: { id: string; permanent?: boolean }) => del<{ ok: boolean }>(base(id), permanent ? { permanent: 'true' } : undefined),
    onSuccess: (_r, v) => {
      if (v.permanent) qc.removeQueries({ queryKey: qk.project(v.id) })
      invalidateProjects(qc, v.permanent ? undefined : v.id)
    },
  })
  const reorder = useMutation({
    mutationFn: (ids: string[]) => post<{ ok: boolean }>('/admin/projects/reorder', { ids }),
    onSettled: () => invalidateProjects(qc),
  })

  return { create, update, duplicate, publish, unpublish, archive, restore, remove, reorder }
}
