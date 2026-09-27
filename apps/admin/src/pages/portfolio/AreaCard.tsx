import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { Badge, Button, Card, Skeleton, buttonClass } from '../../components/ui'
import { errorMessage } from '../../lib/api'
import { fmtRelative } from '../../lib/format'
import { countsOf, liveEntries, type DocArea, type ListArea } from './usePortfolioData'

function Shell({ title, icon, badge, to, children }: { title: string; icon: ReactNode; badge: ReactNode; to: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-white/[0.03] text-accent-2">{icon}</span>
          <h3 className="truncate text-[15px] font-semibold text-fg">{title}</h3>
        </div>
        {badge}
      </div>
      <div className="mt-4 flex-1 text-[13px] text-muted">{children}</div>
      <div className="mt-4 flex justify-end">
        <Link to={to} className={buttonClass('secondary', 'sm')} aria-label={`Edit ${title}`}>
          Edit <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </Card>
  )
}

function LoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div role="alert" className="space-y-2">
      <p className="text-rose-300">{errorMessage(error)}</p>
      <Button size="xs" variant="ghost" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}

export function DocAreaCard({ area, icon }: { area: DocArea; icon: ReactNode }) {
  const { data, isLoading, error, refetch } = area.query
  const badge = isLoading ? (
    <Skeleton className="h-5 w-20" />
  ) : error ? (
    <Badge tone="rose">error</Badge>
  ) : !data?.published ? (
    <Badge tone="gray" dot>
      never published
    </Badge>
  ) : data.hasUnpublishedChanges ? (
    <Badge tone="amber" dot>
      unpublished changes
    </Badge>
  ) : (
    <Badge tone="emerald" dot>
      published
    </Badge>
  )
  return (
    <Shell title={area.title} icon={icon} badge={badge} to={area.to}>
      {isLoading ? (
        <Skeleton className="h-4 w-40" />
      ) : error ? (
        <LoadError error={error} onRetry={() => refetch()} />
      ) : (
        <dl className="space-y-1">
          <div className="flex justify-between gap-3">
            <dt>Last published</dt>
            <dd className="text-fg">{data?.publishedAt ? fmtRelative(data.publishedAt) : '—'}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Draft updated</dt>
            <dd className="text-fg">{data?.updatedAt ? fmtRelative(data.updatedAt) : '—'}</dd>
          </div>
        </dl>
      )}
    </Shell>
  )
}

export function ListAreaCard({ area, icon }: { area: ListArea; icon: ReactNode }) {
  const { isLoading, error, refetch } = area.query
  const c = countsOf(liveEntries(area.query))
  const unpublishedDrafts = c.draft
  const badge = isLoading ? (
    <Skeleton className="h-5 w-20" />
  ) : error ? (
    <Badge tone="rose">error</Badge>
  ) : c.total === 0 ? (
    <Badge tone="gray">empty</Badge>
  ) : c.pending > 0 ? (
    <Badge tone="amber" dot>
      {c.pending} pending
    </Badge>
  ) : unpublishedDrafts > 0 ? (
    <Badge tone="sky" dot>
      {unpublishedDrafts} draft{unpublishedDrafts === 1 ? '' : 's'}
    </Badge>
  ) : (
    <Badge tone="emerald" dot>
      up to date
    </Badge>
  )
  return (
    <Shell title={area.title} icon={icon} badge={badge} to={area.to}>
      {isLoading ? (
        <Skeleton className="h-4 w-40" />
      ) : error ? (
        <LoadError error={error} onRetry={() => refetch()} />
      ) : c.total === 0 ? (
        <p>Nothing added yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Published', c.published],
            ['Drafts', c.draft],
            ['Archived', c.archived],
            ['Unpublished edits', c.pending],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-line bg-white/[0.02] px-2.5 py-2">
              <p className="font-mono text-lg leading-none text-fg">{v}</p>
              <p className="mt-1 text-[11px] leading-tight text-muted">{k}</p>
            </div>
          ))}
        </div>
      )}
    </Shell>
  )
}
