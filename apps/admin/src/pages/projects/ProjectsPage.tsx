import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { FolderKanban, Plus, Search, Trash2 } from 'lucide-react'
import type { ProjectAdmin } from '@pg/shared'
import {
  Button,
  Callout,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Segmented,
  SkeletonRows,
  SortableList,
  buttonClass,
  useToast,
} from '../../components/ui'
import { useDebounced } from '../../lib/forms'
import { useProjects } from '../../lib/queries'
import { ProjectRow } from './ProjectRow'
import { useRowMenu } from './useRowMenu'

type StatusFilter = '' | 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
]

export default function ProjectsPage() {
  const toast = useToast()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<StatusFilter>('')
  const [trash, setTrash] = useState(false)
  const query = useDebounced(q.trim(), 250)
  const list = useProjects({ q: query || undefined, status: status || undefined, trash })
  const menu = useRowMenu()
  const { actions, canWrite } = menu

  // Local order for optimistic drag-and-drop.
  const [order, setOrder] = useState<ProjectAdmin[] | null>(null)
  useEffect(() => setOrder(null), [list.data])
  const rows = order ?? list.data ?? []

  const filtered = !!query || !!status || trash
  const reorderBlocked = filtered
    ? trash
      ? 'Trashed projects have no position — switch back to the main list to reorder.'
      : 'Reordering is off while searching or filtering, because only part of the list is visible. Clear the search and pick “All” to drag projects.'
    : !canWrite
      ? 'You do not have permission to reorder projects.'
      : null

  const onReorder = async (next: ProjectAdmin[], ids: string[]) => {
    setOrder(next)
    try {
      await actions.reorder.mutateAsync(ids)
      toast.success('Order saved', 'The portfolio uses this order.')
    } catch (err) {
      setOrder(null)
      toast.fromError(err, 'Could not save the new order')
    }
  }

  const toggleFeatured = async (p: ProjectAdmin) => {
    try {
      await actions.update.mutateAsync({ id: p.id, body: { featured: !p.featured } })
      toast.success(p.featured ? 'Removed from featured' : 'Marked as featured')
    } catch (err) {
      toast.fromError(err, 'Could not update featured')
    }
  }
  const featuredId = actions.update.isPending ? actions.update.variables?.id : undefined

  const counts = useMemo(() => (list.data ? `${list.data.length} ${trash ? 'in trash' : list.data.length === 1 ? 'project' : 'projects'}` : null), [list.data, trash])

  const pending = menu.pending
  return (
    <div>
      <PageHeader
        eyebrow="Content"
        title="Projects"
        description="Everything shown in the portfolio’s projects section. Drag to set the order visitors see."
        actions={
          canWrite ? (
            <Link to="/projects/new" className={buttonClass('primary', 'md')}>
              <Plus className="h-4 w-4" /> New project
            </Link>
          ) : (
            <Button variant="primary" disabled title="You do not have permission to create projects" icon={<Plus className="h-4 w-4" />}>
              New project
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Input
          aria-label="Search projects"
          placeholder="Search by title or slug"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          leading={<Search className="h-4 w-4" />}
          containerClassName="lg:w-80"
          type="search"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Segmented aria-label="Filter by status" value={status} onChange={setStatus} options={FILTERS} size="sm" />
          <Button
            size="sm"
            variant={trash ? 'danger' : 'ghost'}
            aria-pressed={trash}
            onClick={() => setTrash((t) => !t)}
            icon={<Trash2 className="h-3.5 w-3.5" />}
          >
            Trash
          </Button>
        </div>
        {counts && <span className="font-mono text-[11px] text-dim lg:ml-auto">{counts}</span>}
      </div>

      {reorderBlocked && !!list.data?.length && (
        <Callout className="mb-3" tone={trash ? 'warning' : 'info'}>
          {reorderBlocked}
        </Callout>
      )}

      {list.isLoading ? (
        <Card padded={false} className="p-3">
          <SkeletonRows rows={6} />
        </Card>
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} title="Could not load projects" />
      ) : !rows.length ? (
        <EmptyState
          icon={trash ? <Trash2 className="h-5 w-5" /> : <FolderKanban className="h-5 w-5" />}
          title={trash ? 'Trash is empty' : filtered ? 'No projects match' : 'No projects yet'}
          description={trash ? 'Projects you move to trash appear here until deleted permanently.' : filtered ? 'Try a different search or status.' : 'Create your first project to show it in the portfolio.'}
          action={
            !trash && !filtered && canWrite ? (
              <Link to="/projects/new" className={buttonClass('primary', 'sm')}>
                <Plus className="h-4 w-4" /> New project
              </Link>
            ) : filtered ? (
              <Button size="sm" onClick={() => (setQ(''), setStatus(''), setTrash(false))}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card padded={false} className="overflow-visible">
          <div className="hidden grid-cols-[auto_auto_minmax(0,2fr)_minmax(0,1.3fr)_auto_8.5rem_6.5rem_auto] gap-x-3 border-b border-line px-4 py-2 font-mono text-[10.5px] uppercase tracking-wider text-dim md:grid">
            <span className="w-6" />
            <span className="w-14">Cover</span>
            <span>Title</span>
            <span>Category</span>
            <span className="w-8 text-center">★</span>
            <span>Status</span>
            <span>Updated</span>
            <span className="w-8" />
          </div>
          {reorderBlocked ? (
            rows.map((p) => (
              <ProjectRow
                key={p.id}
                project={p}
                menu={menu.items(p)}
                onToggleFeatured={p.deletedAt ? undefined : () => toggleFeatured(p)}
                featuredDisabledReason={!canWrite ? 'You do not have permission to edit projects' : p.deletedAt ? 'Restore first' : undefined}
                featuredPending={featuredId === p.id}
              />
            ))
          ) : (
            <SortableList
              items={rows}
              getId={(p) => p.id}
              onReorder={onReorder}
              renderItem={(p, handle, s) => (
                <ProjectRow
                  project={p}
                  handle={handle}
                  dragging={s.dragging}
                  menu={menu.items(p)}
                  onToggleFeatured={() => toggleFeatured(p)}
                  featuredPending={featuredId === p.id}
                />
              )}
            />
          )}
        </Card>
      )}

      <ConfirmDialog
        open={!!pending}
        onClose={() => menu.setPending(null)}
        onConfirm={menu.confirm}
        tone={pending?.kind === 'unpublish' || pending?.kind === 'archive' ? 'primary' : 'danger'}
        title={
          pending?.kind === 'purge'
            ? 'Delete project permanently?'
            : pending?.kind === 'trash'
              ? 'Move project to trash?'
              : pending?.kind === 'archive'
                ? 'Archive project?'
                : 'Unpublish project?'
        }
        description={
          pending?.kind === 'purge'
            ? 'This removes the project and its whole version history. It cannot be undone.'
            : pending?.kind === 'trash'
              ? 'It disappears from the portfolio and any schedule is cancelled. You can restore it from Trash.'
              : pending?.kind === 'archive'
                ? 'Archived projects are hidden from the portfolio. Publish again to bring it back.'
                : 'The project is removed from the public site and returns to draft. Your draft is kept.'
        }
        confirmLabel={pending?.kind === 'purge' ? 'Delete permanently' : pending?.kind === 'trash' ? 'Move to trash' : pending?.kind === 'archive' ? 'Archive' : 'Unpublish'}
        typeToConfirm={pending?.kind === 'purge' ? pending.project.title : undefined}
      />
    </div>
  )
}
