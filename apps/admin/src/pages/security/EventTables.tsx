import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import type { AuditRow, SecurityOverview } from '../../lib/types'
import { fmtDateTime } from '../../lib/format'
import { Card, DataTable, EmptyState, Tabs, type Column } from '../../components/ui'
import { Mono, REASON_LABELS, SuccessBadge, When, metaField } from '../../components/admin/shared'

type Kind = 'logins' | 'failedLogins' | 'lockouts' | 'passwordChanges' | 'suspicious'

const actor = (r: AuditRow) => r.actorEmail ?? metaField(r.metadata, 'email') ?? (r.actorId ? r.actorId.slice(0, 10) : 'unknown')

const base: Column<AuditRow>[] = [
  { key: 'time', header: 'Time', cell: (r) => <When iso={r.createdAt} />, value: (r) => fmtDateTime(r.createdAt) },
  { key: 'actor', header: 'Account', primary: true, value: actor, cell: (r) => <span className="break-all">{actor(r)}</span> },
]
const ip: Column<AuditRow> = { key: 'ip', header: 'IP prefix', cell: (r) => (r.ipPrefix ? <Mono>{r.ipPrefix}</Mono> : <span className="text-dim">—</span>) }

function detail(kind: Kind): Column<AuditRow> {
  switch (kind) {
    case 'failedLogins':
      return {
        key: 'reason',
        header: 'Reason',
        value: (r) => metaField(r.metadata, 'reason') ?? r.action,
        cell: (r) => {
          const reason = metaField(r.metadata, 'reason')
          const count = metaField(r.metadata, 'failedCount')
          const text = reason ? (REASON_LABELS[reason] ?? reason) : r.action === 'auth.2fa' ? 'Wrong 2FA code' : 'Failed'
          return (
            <span>
              {text}
              {count && <span className="ml-1 text-dim">(#{count})</span>}
            </span>
          )
        },
      }
    case 'lockouts':
      return { key: 'until', header: 'Locked until', cell: (r) => fmtDateTime(metaField(r.metadata, 'until')) }
    case 'logins':
      return { key: 'remember', header: 'Remember me', cell: (r) => (metaField(r.metadata, 'remember') === 'true' ? 'yes' : 'no') }
    default:
      return {
        key: 'event',
        header: 'Event',
        value: (r) => r.action,
        cell: (r) => (
          <span className="flex items-center gap-2">
            <Mono>{r.action}</Mono>
            {!r.success && <SuccessBadge success={false} />}
          </span>
        ),
      }
  }
}

const TABS: { value: Kind; label: string; empty: string }[] = [
  { value: 'failedLogins', label: 'Failed attempts', empty: 'No failed sign-in attempts in the last 30 days.' },
  { value: 'logins', label: 'Recent logins', empty: 'No sign-ins recorded in the last 30 days.' },
  { value: 'lockouts', label: 'Lockouts', empty: 'No accounts were locked in the last 30 days.' },
  { value: 'passwordChanges', label: 'Password changes', empty: 'No password changes or resets in the last 30 days.' },
  { value: 'suspicious', label: 'Suspicious', empty: 'No refresh-token reuse or 2FA removals detected.' },
]

export function EventTables({ data, loading, error, onRetry }: { data: SecurityOverview | undefined; loading: boolean; error: unknown; onRetry: () => void }) {
  const [tab, setTab] = useState<Kind>('failedLogins')
  const t = TABS.find((x) => x.value === tab)!
  return (
    <Card>
      <h3 className="text-[15px] font-semibold text-fg">Security events</h3>
      <p className="mt-0.5 text-[13px] text-muted">Last 30 days, newest first.</p>
      <Tabs
        className="mb-4 mt-3"
        value={tab}
        onChange={setTab}
        aria-label="Security event type"
        items={TABS.map((x) => ({ value: x.value, label: x.label, count: data?.[x.value].length, alert: x.value === 'suspicious' && !!data?.suspicious.length }))}
      />
      <DataTable
        key={tab}
        columns={[...base, detail(tab), ip]}
        rows={data?.[tab]}
        getRowId={(r) => r.id}
        loading={loading}
        error={error}
        onRetry={onRetry}
        pageSize={10}
        caption={t.label}
        empty={<EmptyState compact icon={<ShieldCheck className="h-5 w-5" />} title="Nothing to review" description={t.empty} />}
      />
    </Card>
  )
}
