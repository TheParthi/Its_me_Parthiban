import type { ReactNode } from 'react'
import { ChevronRight, Trash2 } from 'lucide-react'
import type { UseQueryResult } from '@tanstack/react-query'
import { cn } from '../../lib/format'
import type { AdminMeta } from '../../lib/types'
import { DragHandle, EmptyState, ErrorState, SkeletonRows, SortableList, useToast } from '../ui'
import type { EntryMutations } from './api'
import { EntryBadges } from './EntryBadges'

export interface EntryListProps<T extends AdminMeta> {
  query: UseQueryResult<T[]>
  mutations: EntryMutations<T>
  /** Main content of a row (title, subtitle, dates...). */
  renderRow: (item: T) => ReactNode
  /** Optional thumbnail / icon on the left. */
  renderLeading?: (item: T) => ReactNode
  onOpen: (item: T) => void
  sortable?: boolean
  empty: { icon: ReactNode; title: string; description?: ReactNode; action?: ReactNode }
  label: string
}

/** Ordered list of entries with drag-to-reorder (live items) and an open-in-drawer action. */
export function EntryList<T extends AdminMeta>({ query, mutations, renderRow, renderLeading, onOpen, sortable = true, empty, label }: EntryListProps<T>) {
  const toast = useToast()
  if (query.isLoading) return <SkeletonRows rows={4} />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />
  const items = query.data ?? []
  if (!items.length) return <EmptyState icon={empty.icon} title={empty.title} description={empty.description} action={empty.action} />

  const row = (item: T, handle?: ReactNode, dragging?: boolean) => (
    <div
      className={cn(
        'group flex items-center gap-2 rounded-xl border border-line bg-card px-2 py-2.5 transition-colors hover:border-line-2 sm:px-3',
        dragging && 'border-accent/50 shadow-xl shadow-black/40',
        item.deletedAt && 'opacity-80',
      )}
    >
      {handle}
      {renderLeading?.(item)}
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <div className="min-w-0 flex-1">
          {renderRow(item)}
          <div className="mt-2">
            <EntryBadges entry={item as T & { visible?: boolean; featured?: boolean }} />
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-dim transition-transform group-hover:translate-x-0.5 group-hover:text-fg" aria-hidden />
      </button>
    </div>
  )

  if (!sortable) return <ul aria-label={label} className="space-y-2">{items.map((it) => <li key={it.id}>{row(it)}</li>)}</ul>

  return (
    <SortableList
      items={items}
      getId={(x) => x.id}
      className="space-y-2"
      disabled={mutations.reorder.isPending}
      onReorder={(_next, ids) =>
        mutations.reorder.mutate(ids, {
          onSuccess: () => toast.success('Order saved'),
          onError: (e) => toast.fromError(e, 'Could not save the new order'),
        })
      }
      renderItem={(item, handle, st) => row(item, <DragHandle handle={handle} label={`Drag to reorder ${label}`} />, st.dragging)}
    />
  )
}

export function TrashNote({ count }: { count: number }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted">
      <Trash2 className="h-3.5 w-3.5" aria-hidden />
      {count ? `${count} in trash. Open one to restore it or delete it permanently.` : 'Trash is empty.'}
    </p>
  )
}
