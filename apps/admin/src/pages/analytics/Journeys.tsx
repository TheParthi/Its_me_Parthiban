import { Fragment } from 'react'
import { ChevronRight } from 'lucide-react'
import { ChartCard } from '../../components/charts'
import { cn, fmtNumber } from '../../lib/format'
import type { QueryValue } from '../../lib/api'
import { useJourneys } from './api'
import { stepKind, stepLabel } from './format'

const chip = {
  page: 'border-white/10 bg-white/[0.05] text-fg',
  project: 'border-violet-400/30 bg-violet-500/10 text-violet-200',
  action: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200',
}

export function Journeys({ query, titles }: { query: Record<string, QueryValue>; titles: Map<string, string> }) {
  const q = useJourneys(query)
  const rows = q.data ?? []
  const top = Math.max(1, ...rows.map((r) => r.sessions))
  const total = rows.reduce((n, r) => n + r.sessions, 0)
  return (
    <ChartCard
      title="Visitor journeys"
      description="Most common paths through the site (first 5 distinct steps of each visit)"
      loading={q.isPending}
      error={q.error}
      onRetry={() => q.refetch()}
      skeletonHeight={260}
      empty={!rows.length}
      emptyTitle="No journeys in this period"
      emptyDescription="Journeys appear once visitors browse the public site."
    >
      <div className="mb-3 flex flex-wrap gap-3 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className={cn('h-2.5 w-2.5 rounded-sm border', chip.page)} aria-hidden />Page</span>
        <span className="flex items-center gap-1.5"><span className={cn('h-2.5 w-2.5 rounded-sm border', chip.project)} aria-hidden />Project</span>
        <span className="flex items-center gap-1.5"><span className={cn('h-2.5 w-2.5 rounded-sm border', chip.action)} aria-hidden />Action</span>
      </div>
      <ol className="space-y-3">
        {rows.map((r, i) => (
          <li key={i} className="rounded-lg border border-line bg-white/[0.015] p-3">
            <div className="flex flex-wrap items-center gap-1.5" aria-label={r.steps.map((s) => stepLabel(s, titles)).join(' then ')}>
              {r.steps.length === 0 && <span className="text-xs text-dim">No tracked steps</span>}
              {r.steps.map((s, j) => (
                <Fragment key={j}>
                  {j > 0 && <ChevronRight className="h-3.5 w-3.5 text-dim" aria-hidden />}
                  <span className={cn('inline-flex h-6 items-center rounded-md border px-2 text-xs', chip[stepKind(s)])} title={s}>
                    {stepLabel(s, titles)}
                  </span>
                </Fragment>
              ))}
            </div>
            <div className="mt-2.5 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5" aria-hidden>
                <div className="h-full rounded-full bg-accent" style={{ width: `${(r.sessions / top) * 100}%` }} />
              </div>
              <span className="shrink-0 whitespace-nowrap text-right font-mono text-xs text-muted">
                {fmtNumber(r.sessions)} {r.sessions === 1 ? 'session' : 'sessions'}
                <span className="text-dim"> · {total ? Math.round((r.sessions / total) * 100) : 0}%</span>
              </span>
            </div>
          </li>
        ))}
      </ol>
    </ChartCard>
  )
}
