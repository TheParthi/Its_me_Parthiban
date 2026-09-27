import { Radio } from 'lucide-react'
import { Card, CardHeader, EmptyState, ErrorState, SkeletonRows } from '../../components/ui'
import { fmtRelative } from '../../lib/format'
import { useLive } from './api'
import { deviceLabel, pathLabel } from './format'
import { DeviceIcon } from './SessionExplorer'

export function LiveVisitors() {
  const q = useLive(true)
  const d = q.data
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            Live visitors
            {d && <span className="font-mono text-sm text-muted">{d.sessions.length}</span>}
          </span>
        }
        description={d ? `Active in the last ${d.windowMinutes} minutes · refreshes every 10s` : 'Refreshes every 10s'}
      />
      {q.isPending ? (
        <SkeletonRows rows={3} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} title="Could not load live visitors" />
      ) : d && d.sessions.length === 0 ? (
        <EmptyState compact icon={<Radio className="h-5 w-5" />} title="Nobody on the site right now" />
      ) : (
        <ul className="scroll-thin grid max-h-96 gap-x-6 overflow-y-auto lg:grid-cols-2" aria-live="polite">
          {d?.sessions.map((s) => (
            <li key={s.id} className="flex items-center gap-3 border-b border-line py-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-white/[0.03] text-muted" title={deviceLabel(s.device)}>
                <DeviceIcon device={s.device} className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-fg">
                  {pathLabel(s.currentPath)} <span className="font-mono text-[11px] text-dim">{s.currentPath}</span>
                </p>
                <p className="truncate text-xs text-muted">
                  <span className="font-mono">#{s.id}</span> · {s.referrerDomain ?? 'no referrer'}
                </p>
              </div>
              <span className="shrink-0 text-xs text-dim">{fmtRelative(s.lastSeenAt)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 border-t border-line pt-3 text-xs text-dim">{d?.note ?? 'Approximate — ad blockers, consent choices and network conditions hide some visitors.'}</p>
    </Card>
  )
}
