import type { ReactNode } from 'react'
import { BarChart3 } from 'lucide-react'
import { Card, CardHeader, EmptyState, ErrorState } from '../ui'
import { cn, fmtNumber } from '../../lib/format'

export interface ChartCardProps {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  loading?: boolean
  error?: unknown
  onRetry?: () => void
  /** True when there is nothing to plot. */
  empty?: boolean
  emptyTitle?: ReactNode
  emptyDescription?: ReactNode
  skeletonHeight?: number
  className?: string
  children?: ReactNode
}

/** Card wrapper that handles loading / error / empty around a chart. */
export function ChartCard({
  title,
  description,
  actions,
  loading,
  error,
  onRetry,
  empty,
  emptyTitle = 'No data for this period',
  emptyDescription,
  skeletonHeight = 220,
  className,
  children,
}: ChartCardProps) {
  return (
    <Card className={cn('min-w-0', className)}>
      <CardHeader title={title} description={description} actions={actions} />
      {loading ? (
        <div aria-hidden style={{ height: skeletonHeight }} className="skeleton w-full rounded-md" />
      ) : error ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : empty ? (
        <EmptyState compact icon={<BarChart3 className="h-5 w-5" />} title={emptyTitle} description={emptyDescription} />
      ) : (
        children
      )}
    </Card>
  )
}

/** Compact ranked list with proportional bars — for tables of keys/counts. */
export function RankedList({
  items,
  formatKey = (k) => k,
  label,
  max = 10,
  mono,
}: {
  items: { key: string; count: number }[]
  formatKey?: (k: string) => ReactNode
  label?: string
  max?: number
  mono?: boolean
}) {
  const rows = items.slice(0, max)
  const top = Math.max(1, ...rows.map((r) => r.count))
  return (
    <div>
      {label && (
        <div className="mb-2 flex justify-between text-[11px] uppercase tracking-wider text-dim">
          <span>{label}</span>
          <span>Count</span>
        </div>
      )}
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.key} className="relative overflow-hidden rounded-md px-2.5 py-1.5">
            <span className="absolute inset-y-0 left-0 rounded-md bg-accent/[0.14]" style={{ width: `${(r.count / top) * 100}%` }} aria-hidden />
            <span className="relative flex items-center justify-between gap-3 text-[13px]">
              <span className={cn('min-w-0 truncate text-fg', mono && 'font-mono text-xs')}>{formatKey(r.key)}</span>
              <span className="font-mono text-xs text-muted">{fmtNumber(r.count)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
