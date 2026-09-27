import { useState, type FormEvent } from 'react'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { skillCategorySchema } from '@pg/shared'
import { Button, Card, CardHeader, ColorInput, ConfirmDialog, DragHandle, EmptyState, ErrorState, Input, SkeletonRows, SortableList, useToast } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { useCan } from '../../lib/auth'
import { zodErrors, type FieldErrors } from '../../lib/forms'
import { useSkillCategories } from '../../lib/queries'
import type { SkillCategory } from '../../lib/types'
import { useCategoryMutations } from './categoryApi'

/** Create, rename/recolour, reorder and delete skill categories (changes are live immediately). */
export function CategoriesPanel() {
  const cats = useSkillCategories()
  const m = useCategoryMutations()
  const toast = useToast()
  const can = useCan()
  const canWrite = can('content:write')
  const canDelete = can('content:delete')
  const [editing, setEditing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<SkillCategory | null>(null)

  const remove = async () => {
    if (!deleting) return
    try {
      await m.remove.mutateAsync(deleting.id)
      toast.success(`Deleted “${deleting.name}”`)
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) toast.error('Move or delete its skills first', `“${deleting.name}” still has skills in it.`)
      else toast.fromError(e, 'Could not delete the category')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <Card>
      <CardHeader title="Categories" description="Groups on the skills section. Changes here are live immediately." />
      <div className="mt-4 space-y-3">
        {cats.isLoading ? (
          <SkeletonRows rows={4} />
        ) : cats.isError ? (
          <ErrorState error={cats.error} onRetry={() => cats.refetch()} />
        ) : !cats.data?.length ? (
          <EmptyState compact title="No categories yet" description="Create one below, then add skills to it." />
        ) : (
          <SortableList
            items={cats.data}
            getId={(c) => c.id}
            className="space-y-1.5"
            disabled={!canWrite || m.reorder.isPending || !!editing}
            onReorder={(_n, ids) =>
              m.reorder.mutate(ids, {
                onSuccess: () => toast.success('Category order saved'),
                onError: (e) => toast.fromError(e, 'Could not reorder categories'),
              })
            }
            renderItem={(c, handle) =>
              editing === c.id ? (
                <CategoryForm initial={c} onDone={() => setEditing(null)} />
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-line bg-white/[0.02] px-2 py-1.5">
                  {canWrite && <DragHandle handle={handle} label={`Drag to reorder ${c.name}`} />}
                  <span className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white/10" style={{ background: c.color }} aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-sm text-fg">{c.name}</span>
                  <span className="font-mono text-[11px] text-dim" title={`${c.skillCount ?? 0} skills (including trash)`}>
                    {c.skillCount ?? 0}
                  </span>
                  <Button size="icon-sm" variant="ghost" aria-label={`Edit ${c.name}`} disabled={!canWrite} title={canWrite ? 'Rename or recolour' : 'No permission'} onClick={() => setEditing(c.id)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="hover:text-rose-300"
                    aria-label={`Delete ${c.name}`}
                    disabled={!canDelete}
                    title={canDelete ? 'Delete category' : 'No permission'}
                    onClick={() => setDeleting(c)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )
            }
          />
        )}
        {canWrite && <CategoryForm />}
      </div>
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title={`Delete “${deleting?.name}”?`}
        description={
          deleting?.skillCount
            ? `It still has ${deleting.skillCount} skill(s) (including any in trash). Move or delete them first — the server will refuse otherwise.`
            : 'This category is empty and will be removed from the site.'
        }
        confirmLabel="Delete category"
      />
    </Card>
  )
}

/** Inline create (no `initial`) or edit form. */
function CategoryForm({ initial, onDone }: { initial?: SkillCategory; onDone?: () => void }) {
  const m = useCategoryMutations()
  const toast = useToast()
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? '#8B5CF6')
  const [errors, setErrors] = useState<FieldErrors>({})
  const pending = m.create.isPending || m.update.isPending

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const body = { name: name.trim(), color }
    const errs = zodErrors(skillCategorySchema, body)
    if (errs) return setErrors(errs)
    try {
      if (initial) {
        await m.update.mutateAsync({ id: initial.id, body })
        toast.success('Category updated')
        onDone?.()
      } else {
        await m.create.mutateAsync(body)
        toast.success(`Category “${body.name}” created`)
        setName('')
        setErrors({})
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setErrors({ name: err.message })
      else toast.fromError(err, 'Could not save the category')
    }
  }

  return (
    <form onSubmit={submit} className={initial ? 'space-y-3 rounded-lg border border-accent/40 bg-white/[0.03] p-3' : 'space-y-3 border-t border-line pt-4'}>
      <div className="grid gap-3">
        <Input
          label={initial ? 'Name' : 'New category'}
          placeholder="e.g. Cloud"
          maxLength={40}
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setErrors({})
          }}
          error={errors.name}
          autoFocus={!!initial}
        />
        <ColorInput label="Colour" value={color} onChange={setColor} error={errors.color} />
      </div>
      <div className="flex justify-end gap-2">
        {initial && (
          <Button size="sm" variant="ghost" onClick={onDone} icon={<X className="h-3.5 w-3.5" />}>
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" variant={initial ? 'primary' : 'secondary'} loading={pending} disabled={!name.trim()} icon={initial ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}>
          {initial ? 'Save' : 'Add category'}
        </Button>
      </div>
    </form>
  )
}
