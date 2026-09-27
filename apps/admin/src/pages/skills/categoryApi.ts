import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { SkillCategoryInput } from '@pg/shared'
import { del, patch, post } from '../../lib/api'
import { qk } from '../../lib/queries'
import type { SkillCategory } from '../../lib/types'

/** Skill categories are live immediately (no draft state). */
export function useCategoryMutations() {
  const qc = useQueryClient()
  const refresh = () => {
    qc.invalidateQueries({ queryKey: qk.skillCategories })
  }
  const create = useMutation({
    mutationFn: (b: SkillCategoryInput) => post<SkillCategory>('/admin/skill-categories', b),
    onSuccess: refresh,
  })
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<SkillCategoryInput> }) => patch<SkillCategory>(`/admin/skill-categories/${id}`, body),
    onSuccess: refresh,
  })
  const remove = useMutation({
    mutationFn: (id: string) => del<{ ok: boolean }>(`/admin/skill-categories/${id}`),
    onSuccess: refresh,
  })
  const reorder = useMutation({
    mutationFn: (ids: string[]) => post<{ ok: boolean }>('/admin/skill-categories/reorder', { ids }),
    onMutate: async (ids: string[]) => {
      await qc.cancelQueries({ queryKey: qk.skillCategories })
      const prev = qc.getQueryData<SkillCategory[]>(qk.skillCategories)
      if (prev) {
        const pos = new Map(ids.map((id, i) => [id, i]))
        qc.setQueryData(
          qk.skillCategories,
          [...prev].map((c) => ({ ...c, order: pos.get(c.id) ?? c.order })).sort((a, b) => a.order - b.order),
        )
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.skillCategories, ctx.prev)
    },
    onSettled: refresh,
  })
  return { create, update, remove, reorder }
}
