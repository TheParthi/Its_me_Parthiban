import { Plus, Sparkles } from 'lucide-react'
import { EntryBadges, type EntryMutations } from '../../components/entries'
import { MediaThumb } from '../../components/media/MediaPicker'
import { Button, DragHandle, EmptyState, SortableList, useToast } from '../../components/ui'
import { cn } from '../../lib/format'
import type { SkillAdmin, SkillCategory } from '../../lib/types'

interface Group {
  id: string
  name: string
  color: string
  items: SkillAdmin[]
}

/** Live skills grouped by category, drag-reorderable within each category. */
export function SkillGroups({
  skills,
  categories,
  mutations,
  canWrite,
  onOpen,
  onNew,
}: {
  skills: SkillAdmin[]
  categories: SkillCategory[]
  mutations: EntryMutations<SkillAdmin>
  canWrite: boolean
  onOpen: (s: SkillAdmin) => void
  onNew: (categoryId: string) => void
}) {
  const toast = useToast()
  const known = new Set(categories.map((c) => c.id))
  const groups: Group[] = categories.map((c) => ({ id: c.id, name: c.name, color: c.color, items: skills.filter((s) => s.categoryId === c.id) }))
  const orphans = skills.filter((s) => !known.has(s.categoryId))
  if (orphans.length) groups.push({ id: '__none', name: 'Uncategorised', color: '#6B7280', items: orphans })

  if (!categories.length)
    return <EmptyState icon={<Sparkles className="h-5 w-5" />} title="No categories yet" description="Create a category in the panel, then add skills to it." />

  const reorder = (groupId: string, ids: string[]) => {
    // The API takes the full ordered list; keep the other groups as they are.
    const all = groups.flatMap((g) => (g.id === groupId ? ids : g.items.map((s) => s.id)))
    mutations.reorder.mutate(all, {
      onSuccess: () => toast.success('Skill order saved'),
      onError: (e) => toast.fromError(e, 'Could not save the new order'),
    })
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <section key={g.id} aria-label={`${g.name} skills`} className="rounded-xl border border-line bg-card">
          <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: g.color }} aria-hidden />
            <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">{g.name}</h3>
            <span className="font-mono text-[11px] text-dim">{g.items.length}</span>
            {g.id !== '__none' && (
              <Button size="xs" variant="ghost" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => onNew(g.id)} disabled={!canWrite} aria-label={`Add a skill to ${g.name}`}>
                Add
              </Button>
            )}
          </header>
          <div className="p-3">
            {!g.items.length ? (
              <p className="px-1 py-2 text-xs text-muted">No skills in this category.</p>
            ) : (
              <SortableList
                items={g.items}
                getId={(s) => s.id}
                layout="grid"
                disabled={!canWrite || mutations.reorder.isPending}
                className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3"
                onReorder={(_n, ids) => reorder(g.id, ids)}
                renderItem={(s, handle, st) => (
                  <div
                    className={cn(
                      'group flex h-full items-center gap-1.5 rounded-lg border border-line bg-white/[0.02] px-1.5 py-1.5 transition-colors hover:border-line-2',
                      st.dragging && 'border-accent/50 bg-card shadow-xl shadow-black/40',
                      s.visible === false && 'border-dashed',
                    )}
                  >
                    {canWrite && <DragHandle handle={handle} label={`Drag to reorder ${s.name}`} />}
                    <button type="button" onClick={() => onOpen(s)} className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40">
                      {s.iconId && (
                        <span className="h-7 w-7 shrink-0 overflow-hidden rounded-md border border-line">
                          <MediaThumb id={s.iconId} className="h-full w-full" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className={cn('block truncate text-sm font-medium', s.visible === false ? 'text-muted' : 'text-fg')}>{s.name}</span>
                        <span className="mt-1 block">
                          <EntryBadges entry={s} compact />
                        </span>
                      </span>
                    </button>
                  </div>
                )}
              />
            )}
          </div>
        </section>
      ))}
    </div>
  )
}
