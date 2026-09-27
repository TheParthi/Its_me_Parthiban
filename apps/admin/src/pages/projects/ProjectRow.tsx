import { Link } from 'react-router'
import { MoreHorizontal, Star } from 'lucide-react'
import type { ProjectAdmin } from '@pg/shared'
import { MediaThumb } from '../../components/media/MediaPicker'
import { Button, DragHandle, Menu, StatusBadge, type MenuItem, type SortableHandleProps } from '../../components/ui'
import { cn, fmtDateTime, fmtRelative } from '../../lib/format'

export interface ProjectRowProps {
  project: ProjectAdmin
  handle?: SortableHandleProps
  dragging?: boolean
  menu: MenuItem[]
  onToggleFeatured?: () => void
  featuredDisabledReason?: string
  featuredPending?: boolean
}

/** One project in the list: a table-like row on desktop, a card on mobile. */
export function ProjectRow({ project: p, handle, dragging, menu, onToggleFeatured, featuredDisabledReason, featuredPending }: ProjectRowProps) {
  const scheduled = !!p.publishAt && !p.deletedAt
  const href = `/projects/${p.id}`
  return (
    <div
      className={cn(
        'group grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 border-b border-line bg-card px-3 py-3 last:border-b-0 sm:px-4',
        'md:grid-cols-[auto_auto_minmax(0,2fr)_minmax(0,1.3fr)_auto_8.5rem_6.5rem_auto]',
        dragging && 'rounded-lg border border-accent/40 shadow-xl shadow-black/40',
      )}
    >
      {handle ? <DragHandle handle={handle} label={`Reorder ${p.title}`} className="hidden md:grid" /> : <span className="hidden w-6 md:block" aria-hidden />}

      <Link to={href} className="relative block h-11 w-16 shrink-0 overflow-hidden rounded-md border border-line bg-white/[0.03] md:h-10 md:w-14" tabIndex={-1} aria-hidden>
        {p.coverId ? (
          <MediaThumb id={p.coverId} className="h-full w-full" />
        ) : (
          <span className="block h-full w-full" style={{ background: `linear-gradient(135deg, ${p.accent}55, transparent)` }} />
        )}
      </Link>

      <div className="min-w-0">
        <Link to={href} className="block truncate text-sm font-medium text-fg hover:text-violet-200 focus-visible:underline">
          {p.title || 'Untitled project'}
        </Link>
        <p className="truncate font-mono text-[11px] text-dim">/{p.slug}</p>
        <p className="mt-0.5 truncate text-xs text-muted md:hidden">{p.category}</p>
      </div>

      <p className="hidden truncate text-[13px] text-muted md:block" title={p.category}>
        {p.category || '—'}
      </p>

      <div className="col-span-3 row-start-2 flex flex-wrap items-center gap-2 md:col-span-1 md:row-start-auto md:contents">
        <button
          type="button"
          onClick={onToggleFeatured}
          disabled={!onToggleFeatured || !!featuredDisabledReason || featuredPending}
          aria-pressed={p.featured}
          aria-label={p.featured ? `Unfeature ${p.title}` : `Feature ${p.title}`}
          title={featuredDisabledReason ?? (p.featured ? 'Featured — click to unfeature' : 'Mark as featured')}
          className={cn(
            'grid h-8 w-8 place-items-center rounded-md transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50',
            p.featured ? 'text-amber-300' : 'text-dim hover:text-fg',
            featuredPending && 'animate-pulse',
          )}
        >
          <Star className="h-4 w-4" fill={p.featured ? 'currentColor' : 'none'} />
        </button>

        <span className="inline-flex items-center gap-1.5">
          <StatusBadge status={scheduled && p.status !== 'PUBLISHED' ? 'SCHEDULED' : p.status} />
          {p.hasUnpublishedChanges && p.status === 'PUBLISHED' && (
            <span className="h-2 w-2 rounded-full bg-amber-400" title="Unpublished changes" aria-label="Unpublished changes" role="img" />
          )}
          {scheduled && p.status === 'PUBLISHED' && (
            <span className="font-mono text-[10.5px] text-sky-300" title={`Scheduled ${fmtDateTime(p.publishAt)}`}>
              sched.
            </span>
          )}
        </span>

        <span className="ml-auto font-mono text-[11px] text-dim md:ml-0" title={fmtDateTime(p.updatedAt)}>
          {p.deletedAt ? `trashed ${fmtRelative(p.deletedAt)}` : fmtRelative(p.updatedAt)}
        </span>
      </div>

      <div className="col-start-3 row-start-1 md:col-start-auto md:row-start-auto">
        <Menu
          label={`Actions for ${p.title}`}
          items={menu}
          trigger={(t) => (
            <Button {...t} variant="ghost" size="icon-sm" aria-label={`Actions for ${p.title}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          )}
        />
      </div>
    </div>
  )
}
