import { useState } from 'react'
import { LogOut, MonitorSmartphone } from 'lucide-react'
import type { SecuritySession } from '../../lib/types'
import { Badge, Button, Callout, ConfirmDialog, DataTable, EmptyState, type Column, useToast } from '../../components/ui'
import { Gate, Mono, currentSessionId, usePerm, When } from '../../components/admin/shared'
import { useRevokeSession } from './securityApi'

export function SessionsTable({ rows, loading, error, onRetry }: { rows: SecuritySession[] | undefined; loading: boolean; error: unknown; onRetry: () => void }) {
  const write = usePerm('security:write')
  const revoke = useRevokeSession()
  const toast = useToast()
  const [target, setTarget] = useState<SecuritySession | null>(null)
  const current = currentSessionId()
  const isCurrent = (s: SecuritySession) => s.id === current

  const columns: Column<SecuritySession>[] = [
    {
      key: 'user',
      header: 'User',
      primary: true,
      value: (s) => `${s.user.name} ${s.user.email}`,
      cell: (s) => (
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 font-medium text-fg">
            {s.user.name}
            {isCurrent(s) && <Badge tone="violet">this device</Badge>}
          </div>
          <div className="truncate text-xs text-muted">{s.user.email}</div>
        </div>
      ),
    },
    {
      key: 'device',
      header: 'Device',
      value: (s) => s.userAgent ?? '',
      cell: (s) => (
        <span className="inline-flex items-center gap-1.5">
          <MonitorSmartphone className="h-3.5 w-3.5 text-dim" aria-hidden />
          {s.userAgent || <span className="text-dim">Unknown</span>}
        </span>
      ),
    },
    { key: 'ip', header: 'IP prefix', cell: (s) => (s.ipPrefix ? <Mono>{s.ipPrefix}</Mono> : <span className="text-dim">—</span>) },
    { key: 'created', header: 'Signed in', cell: (s) => <When iso={s.createdAt} /> },
    { key: 'used', header: 'Last used', cell: (s) => <When iso={s.lastUsedAt} /> },
    { key: 'remember', header: 'Remember', hideOnMobile: true, cell: (s) => (s.remember ? <Badge tone="sky">remembered</Badge> : <span className="text-dim">no</span>) },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      className: 'text-right',
      cell: (s) => (
        <Gate reason={write.reason}>
          <Button size="xs" variant="danger" disabled={!write.allowed} onClick={() => setTarget(s)} icon={<LogOut className="h-3.5 w-3.5" />}>
            Revoke
          </Button>
        </Gate>
      ),
    },
  ]

  const self = target && isCurrent(target)
  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(s) => s.id}
        loading={loading}
        error={error}
        onRetry={onRetry}
        searchable
        searchPlaceholder="Search sessions…"
        pageSize={10}
        caption="Active sessions"
        empty={<EmptyState compact icon={<MonitorSmartphone className="h-5 w-5" />} title="No active sessions" />}
      />
      <ConfirmDialog
        open={!!target}
        onClose={() => setTarget(null)}
        title={self ? 'Sign out this device?' : 'Revoke this session?'}
        description={target ? `${target.user.name} · ${target.userAgent || 'Unknown device'}${target.ipPrefix ? ` · ${target.ipPrefix}` : ''}` : undefined}
        confirmLabel={self ? 'Sign me out' : 'Revoke session'}
        onConfirm={async () => {
          if (!target) return
          await revoke.mutateAsync(target.id).then(
            () => {
              toast.success(self ? 'Session revoked — you’ll be signed out shortly' : 'Session revoked')
              setTarget(null)
            },
            (e) => toast.fromError(e, 'Could not revoke the session'),
          )
        }}
      >
        {self ? (
          <Callout tone="warning" title="This is your current session">
            You’ll be signed out of this browser and need to sign in again.
          </Callout>
        ) : (
          <p className="text-[13px] text-muted">The device is signed out on its next request. Other sessions for this user stay active.</p>
        )}
      </ConfirmDialog>
    </>
  )
}
