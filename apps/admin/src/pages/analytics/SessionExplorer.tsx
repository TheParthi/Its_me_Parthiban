import { useState } from 'react'
import { Monitor, Smartphone, Tablet, HelpCircle } from 'lucide-react'
import { Card, CardHeader, DataTable, EmptyState, type Column } from '../../components/ui'
import { fmtDateTime, fmtDuration, fmtRelative } from '../../lib/format'
import { useSessions, type SessionRow } from './api'
import { deviceLabel, shortId, sourceLabel } from './format'
import { SessionDrawer } from './SessionDrawer'

const PAGE_SIZE = 20

export function DeviceIcon({ device, className = 'h-3.5 w-3.5' }: { device: string; className?: string }) {
  const I = device === 'mobile' ? Smartphone : device === 'tablet' ? Tablet : device === 'desktop' ? Monitor : HelpCircle
  return <I className={className} aria-hidden />
}

const columns: Column<SessionRow>[] = [
  {
    key: 'time',
    header: 'Started',
    primary: true,
    cell: (s) => (
      <span title={fmtDateTime(s.startedAt)} className="whitespace-nowrap text-fg">
        {fmtRelative(s.startedAt)}
        <span className="ml-2 font-mono text-[11px] text-dim">#{shortId(s.id)}</span>
      </span>
    ),
  },
  { key: 'landing', header: 'Landing page', cell: (s) => <span className="font-mono text-xs text-fg">{s.landingPath}</span> },
  {
    key: 'ref',
    header: 'Referrer',
    cell: (s) => (
      <span className="text-muted">
        {s.referrerDomain ?? <span className="text-dim">{sourceLabel(s.source)}</span>}
      </span>
    ),
  },
  {
    key: 'device',
    header: 'Device',
    cell: (s) => (
      <span className="inline-flex items-center gap-1.5 text-muted">
        <DeviceIcon device={s.device} />
        {deviceLabel(s.device)}
      </span>
    ),
  },
  { key: 'browser', header: 'Browser', hideOnMobile: true, cell: (s) => <span className="text-muted">{s.browser}</span> },
  { key: 'os', header: 'OS', hideOnMobile: true, cell: (s) => <span className="text-muted">{s.os}</span> },
  { key: 'country', header: 'Country', hideOnMobile: true, cell: (s) => <span className="text-muted">{s.country ?? '—'}</span> },
  { key: 'duration', header: 'Engaged', cell: (s) => <span className="font-mono text-xs text-muted">{fmtDuration(s.engagedSec)}</span> },
  { key: 'pages', header: 'Pages', cell: (s) => <span className="font-mono text-xs text-muted">{s.pageViews}</span> },
]

export function SessionExplorer() {
  const [page, setPage] = useState(1)
  const [openId, setOpenId] = useState<string | null>(null)
  const q = useSessions(page, PAGE_SIZE, true)
  return (
    <Card>
      <CardHeader
        title="Session explorer"
        description="Most recent visits first, all time. Select a session to see its event timeline."
      />
      <DataTable
        caption="Recent sessions"
        columns={columns}
        rows={q.data?.items}
        getRowId={(s) => s.id}
        loading={q.isPending}
        error={q.error}
        onRetry={() => q.refetch()}
        onRowClick={(s) => setOpenId(s.id)}
        activeRowId={openId}
        serverPage={{ page, pageSize: PAGE_SIZE, total: q.data?.total ?? 0, onPage: setPage }}
        empty={<EmptyState compact title="No sessions recorded" description="Sessions appear once the public site sends analytics events." />}
      />
      <SessionDrawer id={openId} onClose={() => setOpenId(null)} />
    </Card>
  )
}
