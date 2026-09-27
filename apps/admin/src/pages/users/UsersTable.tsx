import type { ReactNode } from 'react'
import { Ban, CircleCheck, History, LogOut, ShieldCheck, ShieldOff, Trash2, UserCog } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import type { AdminUserRow } from '../../lib/types'
import { Badge, Button, DataTable, type Column } from '../../components/ui'
import { RoleBadge, When } from '../../components/admin/shared'
import type { UserAction } from './UserDialogs'

interface Props {
  rows: AdminUserRow[] | undefined
  loading: boolean
  error: unknown
  onRetry: () => void
  onAction: (a: UserAction, u: AdminUserRow) => void
  onActivity: (u: AdminUserRow) => void
}

function IconAction({ label, reason, onClick, children, danger }: { label: string; reason?: string; onClick: () => void; children: ReactNode; danger?: boolean }) {
  return (
    <span title={reason ?? label} className={reason ? 'cursor-not-allowed' : undefined}>
      <Button size="icon-sm" variant="ghost" aria-label={reason ? `${label} (${reason})` : label} disabled={!!reason} onClick={onClick} className={danger ? 'text-rose-300 hover:text-rose-200' : undefined}>
        {children}
      </Button>
    </span>
  )
}

export function UsersTable({ rows, loading, error, onRetry, onAction, onActivity }: Props) {
  const { user, can } = useAuth()
  const canWrite = can('users:write')
  const canRevoke = can('security:write')
  const canActivity = can('audit:read')

  const columns: Column<AdminUserRow>[] = [
    {
      key: 'name',
      header: 'User',
      primary: true,
      value: (u) => `${u.name} ${u.email}`,
      cell: (u) => (
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 font-medium text-fg">
            {u.name}
            {u.id === user?.id && <Badge tone="violet">you</Badge>}
          </div>
          <div className="truncate text-xs text-muted">{u.email}</div>
        </div>
      ),
    },
    { key: 'role', header: 'Role', value: (u) => u.role.label, cell: (u) => <RoleBadge role={u.role.name} label={u.role.label} /> },
    {
      key: 'status',
      header: 'Status',
      cell: (u) => (
        <span className="flex flex-wrap gap-1">
          {u.disabled ? <Badge tone="rose">disabled</Badge> : u.pendingInvite ? <Badge tone="amber">invite pending</Badge> : <Badge tone="emerald">active</Badge>}
          {u.lockedUntil && new Date(u.lockedUntil) > new Date() && <Badge tone="rose">locked</Badge>}
        </span>
      ),
    },
    {
      key: '2fa',
      header: '2FA',
      cell: (u) =>
        u.totpEnabled ? (
          <span className="inline-flex items-center gap-1 text-emerald-300"><ShieldCheck className="h-4 w-4" aria-hidden /> On</span>
        ) : (
          <span className="inline-flex items-center gap-1 text-muted"><ShieldOff className="h-4 w-4" aria-hidden /> Off</span>
        ),
    },
    { key: 'last', header: 'Last login', cell: (u) => <When iso={u.lastLoginAt} /> },
    { key: 'sessions', header: 'Sessions', className: 'font-mono', cell: (u) => u.activeSessions },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (u) => {
        const self = u.id === user?.id
        const selfReason = 'You can’t change your own account here — use Account settings'
        const writeReason = !canWrite ? 'Requires users:write' : self ? selfReason : undefined
        return (
          <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
            <IconAction label="View activity" reason={canActivity ? undefined : 'Requires audit:read'} onClick={() => onActivity(u)}>
              <History className="h-4 w-4" />
            </IconAction>
            <IconAction label="Change role" reason={writeReason} onClick={() => onAction('role', u)}>
              <UserCog className="h-4 w-4" />
            </IconAction>
            <IconAction label={u.disabled ? 'Enable account' : 'Disable account'} reason={writeReason} onClick={() => onAction('toggle', u)}>
              {u.disabled ? <CircleCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
            </IconAction>
            <IconAction
              label="Revoke all sessions"
              reason={!canRevoke ? 'Requires security:write' : self ? 'Sign out other devices from the Security page' : !u.activeSessions ? 'No active sessions' : undefined}
              onClick={() => onAction('revoke', u)}
            >
              <LogOut className="h-4 w-4" />
            </IconAction>
            <IconAction label="Remove user" danger reason={!canWrite ? 'Requires users:write' : self ? 'You can’t remove yourself' : undefined} onClick={() => onAction('remove', u)}>
              <Trash2 className="h-4 w-4" />
            </IconAction>
          </div>
        )
      },
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowId={(u) => u.id}
      loading={loading}
      error={error}
      onRetry={onRetry}
      searchable
      searchPlaceholder="Search users…"
      caption="Administrators"
      rowClassName={(u) => (u.disabled ? 'opacity-60' : undefined)}
    />
  )
}
