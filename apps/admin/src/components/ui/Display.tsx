import { useId, useState, type HTMLAttributes, type ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, CircleAlert, Info, Minus, RefreshCw } from 'lucide-react'
import { errorMessage } from '../../lib/api'
import { cn, delta as calcDelta, fmtNumber } from '../../lib/format'
import { Button } from './Button'

export function Card({ className, children, padded = true, ...rest }: HTMLAttributes<HTMLDivElement> & { padded?: boolean }) {
  return (
    <div className={cn('rounded-xl border border-line bg-card', padded && 'p-5', className)} {...rest}>
      {children}
    </div>
  )
}

export function CardHeader({ title, description, actions, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-fg">{title}</h3>
        {description && <div className="mt-0.5 text-[13px] text-muted">{description}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export function PageHeader({ title, description, actions, eyebrow, meta }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode; meta?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight text-fg md:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p>}
        {meta && <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export function EmptyState({ icon, title, description, action, className, compact }: { icon?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string; compact?: boolean }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-xl border border-dashed border-line-2 text-center', compact ? 'px-4 py-8' : 'px-6 py-14', className)}>
      {icon && <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl border border-line bg-white/[0.03] text-muted">{icon}</div>}
      <p className="text-sm font-medium text-fg">{title}</p>
      {description && <div className="mt-1 max-w-md text-[13px] text-muted">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry, title = 'Could not load this', className }: { error: unknown; onRetry?: () => void; title?: string; className?: string }) {
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/[0.04] px-6 py-10 text-center', className)}>
      <CircleAlert className="mb-2 h-5 w-5 text-rose-400" aria-hidden />
      <p className="text-sm font-medium text-fg">{title}</p>
      <p className="mt-1 max-w-md text-[13px] text-muted">{errorMessage(error)}</p>
      {onRetry && (
        <Button size="sm" className="mt-4" onClick={onRetry} icon={<RefreshCw className="h-3.5 w-3.5" />}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-md', className)} aria-hidden />
}

export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-11 w-full" />
      ))}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading page">
      <Skeleton className="mb-2 h-8 w-56" />
      <Skeleton className="mb-8 h-4 w-80" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="mt-4 h-72" />
    </div>
  )
}

export type BadgeTone = 'neutral' | 'violet' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'gray' | 'sky'

const tones: Record<BadgeTone, string> = {
  neutral: 'border-white/10 bg-white/[0.05] text-[#c9ced8]',
  violet: 'border-violet-400/25 bg-violet-500/10 text-violet-300',
  cyan: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-300',
  sky: 'border-sky-400/25 bg-sky-400/10 text-sky-300',
  emerald: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  amber: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
  rose: 'border-rose-400/25 bg-rose-400/10 text-rose-300',
  gray: 'border-white/10 bg-white/[0.04] text-[#8a91a0]',
}

export function Badge({ tone = 'neutral', children, className, dot }: { tone?: BadgeTone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn('inline-flex h-5 items-center gap-1.5 whitespace-nowrap rounded-md border px-1.5 font-mono text-[10.5px] font-medium uppercase tracking-wide', tones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  )
}

const STATUS_TONE: Record<string, BadgeTone> = {
  DRAFT: 'amber',
  PUBLISHED: 'emerald',
  ARCHIVED: 'gray',
  NEW: 'cyan',
  READ: 'neutral',
  REPLIED: 'violet',
  SPAM: 'rose',
  SCHEDULED: 'sky',
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge tone={STATUS_TONE[status] ?? 'neutral'} dot className={className}>
      {status.toLowerCase()}
    </Badge>
  )
}

/** Publish state for a draft/publish entity. */
export function PublishStateBadge({ status, hasUnpublishedChanges, publishAt }: { status: string; hasUnpublishedChanges?: boolean; publishAt?: string | null }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <StatusBadge status={publishAt && status !== 'PUBLISHED' ? 'SCHEDULED' : status} />
      {hasUnpublishedChanges && status === 'PUBLISHED' && (
        <Badge tone="amber" className="normal-case">
          unpublished changes
        </Badge>
      )}
    </span>
  )
}

export function InfoTip({ children, label = 'More information', className }: { children: ReactNode; label?: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <span className={cn('relative inline-flex', className)} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        className="grid h-4 w-4 place-items-center rounded-full text-dim hover:text-fg"
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>
      {open && (
        <span
          role="tooltip"
          id={id}
          className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-line-2 bg-[#1b2030] px-3 py-2 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-[#d5d9e1] shadow-xl"
        >
          {children}
        </span>
      )}
    </span>
  )
}

export interface StatCardProps {
  label: ReactNode
  value: number | null | undefined
  previous?: number | null
  format?: (n: number) => string
  icon?: ReactNode
  info?: ReactNode
  /** When lower is better (e.g. failed logins). */
  invert?: boolean
  loading?: boolean
  footer?: ReactNode
  className?: string
}

/** Metric with its change vs the previous period. */
export function StatCard({ label, value, previous, format = (n) => fmtNumber(n), icon, info, invert, loading, footer, className }: StatCardProps) {
  const d = value != null && previous != null ? calcDelta(value, previous) : undefined
  const up = d != null && d > 0
  const down = d != null && d < 0
  const good = invert ? down : up
  const bad = invert ? up : down
  return (
    <Card className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[13px] text-muted">
          {label}
          {info && <InfoTip>{info}</InfoTip>}
        </span>
        {icon && <span className="text-dim">{icon}</span>}
      </div>
      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <div className="font-display text-[28px] font-semibold leading-none tracking-tight text-fg">{value == null ? '—' : format(value)}</div>
      )}
      {!loading && previous !== undefined && (
        <div className="flex items-center gap-1.5 text-xs">
          {d === undefined ? null : d === null ? (
            <span className="text-muted">No previous data</span>
          ) : (
            <>
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded px-1 py-0.5 font-mono font-medium',
                  good && 'bg-emerald-400/10 text-emerald-300',
                  bad && 'bg-rose-400/10 text-rose-300',
                  !good && !bad && 'bg-white/5 text-muted',
                )}
              >
                {up ? <ArrowUpRight className="h-3 w-3" /> : down ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                {Math.abs(d * 100).toFixed(d !== 0 && Math.abs(d) < 0.1 ? 1 : 0)}%
              </span>
              <span className="text-dim">vs previous period ({previous == null ? '—' : format(previous)})</span>
            </>
          )}
        </div>
      )}
      {footer}
    </Card>
  )
}

export function KeyValue({ items, className }: { items: [ReactNode, ReactNode][]; className?: string }) {
  return (
    <dl className={cn('grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[13px]', className)}>
      {items.map(([k, v], i) => (
        <div key={i} className="contents">
          <dt className="text-muted">{k}</dt>
          <dd className="min-w-0 break-words text-fg">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn('border-line', className)} />
}

export function SectionTitle({ children, description, className }: { children: ReactNode; description?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-3', className)}>
      <h3 className="text-sm font-semibold text-fg">{children}</h3>
      {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
    </div>
  )
}

export function Callout({ tone = 'info', title, children, className, icon }: { tone?: 'info' | 'warning' | 'danger' | 'success'; title?: ReactNode; children?: ReactNode; className?: string; icon?: ReactNode }) {
  const t = {
    info: 'border-cyan-400/20 bg-cyan-400/[0.05] text-cyan-100',
    warning: 'border-amber-400/25 bg-amber-400/[0.06] text-amber-100',
    danger: 'border-rose-400/25 bg-rose-400/[0.06] text-rose-100',
    success: 'border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-100',
  }[tone]
  return (
    <div className={cn('flex gap-3 rounded-lg border px-4 py-3 text-[13px]', t, className)}>
      {icon ?? <Info className="mt-0.5 h-4 w-4 shrink-0 opacity-80" aria-hidden />}
      <div className="min-w-0">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn('opacity-85', title && 'mt-0.5')}>{children}</div>}
      </div>
    </div>
  )
}
