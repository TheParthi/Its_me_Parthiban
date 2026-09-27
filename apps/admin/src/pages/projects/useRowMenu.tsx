import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Archive, ArchiveRestore, Copy, EyeOff, Pencil, Send, Trash2, Undo2 } from 'lucide-react'
import type { ProjectAdmin } from '@pg/shared'
import type { MenuItem } from '../../components/ui'
import { useToast } from '../../components/ui'
import { useCan } from '../../lib/auth'
import { useProjectActions } from './projectApi'

type Pending = { kind: 'trash' | 'purge' | 'archive' | 'unpublish'; project: ProjectAdmin } | null

/** Row actions for the project list plus the confirmation each one needs. */
export function useRowMenu() {
  const can = useCan()
  const toast = useToast()
  const navigate = useNavigate()
  const a = useProjectActions()
  const [pending, setPending] = useState<Pending>(null)
  const canWrite = can('content:write')
  const canPublish = can('content:publish')
  const canDelete = can('content:delete')
  const noPerm = (p: boolean) => (p ? undefined : 'no permission')

  const run = async (fn: () => Promise<unknown>, ok: string, fail: string) => {
    try {
      await fn()
      toast.success(ok)
      return true
    } catch (err) {
      toast.fromError(err, fail)
      return false
    }
  }

  const items = (p: ProjectAdmin): MenuItem[] => {
    if (p.deletedAt)
      return [
        { label: 'Restore', icon: <Undo2 className="h-4 w-4" />, disabled: !canDelete, hint: noPerm(canDelete), onSelect: () => run(() => a.restore.mutateAsync(p.id), `Restored “${p.title}”`, 'Could not restore') },
        { label: 'Delete permanently', icon: <Trash2 className="h-4 w-4" />, danger: true, disabled: !canDelete, hint: noPerm(canDelete), separatorBefore: true, onSelect: () => setPending({ kind: 'purge', project: p }) },
      ]
    const published = p.status === 'PUBLISHED'
    return [
      { label: 'Edit', icon: <Pencil className="h-4 w-4" />, onSelect: () => navigate(`/projects/${p.id}`) },
      {
        label: 'Duplicate',
        icon: <Copy className="h-4 w-4" />,
        disabled: !canWrite,
        hint: noPerm(canWrite),
        onSelect: async () => {
          try {
            const copy = await a.duplicate.mutateAsync(p.id)
            toast.success('Project duplicated', 'Opening the copy in the editor.')
            navigate(`/projects/${copy.id}`)
          } catch (err) {
            toast.fromError(err, 'Could not duplicate')
          }
        },
      },
      published
        ? { label: 'Unpublish', icon: <EyeOff className="h-4 w-4" />, disabled: !canPublish, hint: noPerm(canPublish), separatorBefore: true, onSelect: () => setPending({ kind: 'unpublish', project: p }) }
        : { label: 'Publish', icon: <Send className="h-4 w-4" />, disabled: !canPublish, hint: noPerm(canPublish), separatorBefore: true, onSelect: () => run(() => a.publish.mutateAsync({ id: p.id }), `Published “${p.title}”`, 'Could not publish') },
      p.status === 'ARCHIVED'
        ? { label: 'Archived', icon: <ArchiveRestore className="h-4 w-4" />, disabled: true, hint: 'publish to restore' }
        : { label: 'Archive', icon: <Archive className="h-4 w-4" />, disabled: !canPublish, hint: noPerm(canPublish), onSelect: () => setPending({ kind: 'archive', project: p }) },
      { label: 'Move to trash', icon: <Trash2 className="h-4 w-4" />, danger: true, disabled: !canDelete, hint: noPerm(canDelete), separatorBefore: true, onSelect: () => setPending({ kind: 'trash', project: p }) },
    ]
  }

  const confirm = async () => {
    if (!pending) return
    const { kind, project: p } = pending
    const ok =
      kind === 'trash'
        ? await run(() => a.remove.mutateAsync({ id: p.id }), `Moved “${p.title}” to trash`, 'Could not move to trash')
        : kind === 'purge'
          ? await run(() => a.remove.mutateAsync({ id: p.id, permanent: true }), `Deleted “${p.title}” permanently`, 'Could not delete')
          : kind === 'archive'
            ? await run(() => a.archive.mutateAsync(p.id), `Archived “${p.title}”`, 'Could not archive')
            : await run(() => a.unpublish.mutateAsync(p.id), `Unpublished “${p.title}”`, 'Could not unpublish')
    if (ok) setPending(null)
  }

  return { items, pending, setPending, confirm, actions: a, canWrite }
}
