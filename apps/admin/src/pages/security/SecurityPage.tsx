import { KeyRound, Lock, MonitorSmartphone, ShieldAlert, ShieldCheck, ShieldOff } from 'lucide-react'
import type { SecurityOverview } from '../../lib/types'
import { Badge, Card, CardHeader, DataTable, PageHeader, StatCard, type Column } from '../../components/ui'
import { RoleBadge } from '../../components/admin/shared'
import { EventTables } from './EventTables'
import { PolicyForm } from './PolicyForm'
import { SessionsTable } from './SessionsTable'
import { useSecurityOverview } from './securityApi'

type TwoFactorRow = SecurityOverview['twoFactor'][number]

const twoFactorColumns: Column<TwoFactorRow>[] = [
  {
    key: 'user',
    header: 'User',
    primary: true,
    value: (u) => `${u.name} ${u.email}`,
    cell: (u) => (
      <div className="min-w-0">
        <div className="font-medium text-fg">{u.name}</div>
        <div className="truncate text-xs text-muted">{u.email}</div>
      </div>
    ),
  },
  { key: 'role', header: 'Role', cell: (u) => <RoleBadge role={u.role} /> },
  {
    key: '2fa',
    header: 'Two-factor',
    cell: (u) =>
      u.totpEnabled ? (
        <span className="inline-flex items-center gap-1 text-emerald-300"><ShieldCheck className="h-4 w-4" aria-hidden /> Enabled</span>
      ) : (
        <span className="inline-flex items-center gap-1 text-amber-300"><ShieldOff className="h-4 w-4" aria-hidden /> Not set up</span>
      ),
  },
  {
    key: 'state',
    header: 'Account',
    cell: (u) =>
      u.disabled ? <Badge tone="rose">disabled</Badge> : u.lockedUntil && new Date(u.lockedUntil) > new Date() ? <Badge tone="rose">locked</Badge> : <Badge tone="emerald">active</Badge>,
  },
]

export default function SecurityPage() {
  const q = useSecurityOverview()
  const d = q.data
  const active = d?.twoFactor.filter((u) => !u.disabled) ?? []
  const with2fa = active.filter((u) => u.totpEnabled).length
  const capped = (n: number, cap: number) => (n >= cap ? `${cap}+` : String(n))

  return (
    <div className="space-y-5">
      <PageHeader title="Security" description="Sign-in activity, active sessions and login policy for the admin." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active sessions" value={d?.sessions.length} loading={q.isLoading} icon={<MonitorSmartphone className="h-4 w-4" />} />
        <StatCard
          label="Failed logins · 30d"
          value={d?.failedLogins.length}
          format={(n) => capped(n, 50)}
          loading={q.isLoading}
          icon={<ShieldAlert className="h-4 w-4" />}
          info="Wrong passwords, unknown emails and failed 2FA codes. Shows up to the 50 most recent."
        />
        <StatCard label="Lockouts · 30d" value={d?.lockouts.length} format={(n) => capped(n, 25)} loading={q.isLoading} icon={<Lock className="h-4 w-4" />} />
        <StatCard
          label="2FA coverage"
          value={d ? with2fa : undefined}
          format={(n) => `${n}/${active.length}`}
          loading={q.isLoading}
          icon={<KeyRound className="h-4 w-4" />}
          info="Active (not disabled) administrators with two-factor authentication turned on."
        />
      </div>

      <Card>
        <CardHeader title="Active sessions" description="Signed-in devices. Browser and OS family and a truncated IP only — full addresses are never stored." />
        <SessionsTable rows={d?.sessions} loading={q.isLoading} error={q.error} onRetry={() => q.refetch()} />
      </Card>

      <EventTables data={d} loading={q.isLoading} error={q.error} onRetry={() => q.refetch()} />

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader title="Two-factor status" description="Per administrator." />
          <DataTable columns={twoFactorColumns} rows={d?.twoFactor} getRowId={(u) => u.id} loading={q.isLoading} error={q.error} onRetry={() => q.refetch()} caption="Two-factor status" />
        </Card>
        <PolicyForm policy={d?.policy} />
      </div>
    </div>
  )
}
