import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import type { AdminUserRow } from '../../lib/types'
import { Button, Callout, PageHeader, Tabs } from '../../components/ui'
import { Gate, usePerm } from '../../components/admin/shared'
import { InviteModal } from './InviteModal'
import { RolesMatrix } from './RolesMatrix'
import { UserActivityDrawer } from './UserActivityDrawer'
import { UserDialogs, type UserAction } from './UserDialogs'
import { UsersTable } from './UsersTable'
import { useUsers } from './usersApi'

type Tab = 'users' | 'roles'

export default function UsersPage() {
  const [tab, setTab] = useState<Tab>('users')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [action, setAction] = useState<{ a: UserAction; u: AdminUserRow } | null>(null)
  const [activity, setActivity] = useState<AdminUserRow | null>(null)
  const [activityOpen, setActivityOpen] = useState(false)
  const write = usePerm('users:write')
  const users = useUsers()

  // Keep the dialog target in sync with fresh data (e.g. session counts).
  const target = action ? (users.data?.find((u) => u.id === action.u.id) ?? action.u) : null

  return (
    <div>
      <PageHeader
        title="User Management"
        description="Invite administrators, assign roles and control access."
        actions={
          <Gate reason={write.reason}>
            <Button variant="primary" icon={<UserPlus className="h-4 w-4" />} disabled={!write.allowed} onClick={() => setInviteOpen(true)}>
              Invite user
            </Button>
          </Gate>
        }
      />

      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-5"
        aria-label="Users sections"
        items={[
          { value: 'users', label: 'Users', count: users.data?.length },
          { value: 'roles', label: 'Roles & permissions' },
        ]}
      />

      {tab === 'users' ? (
        <div className="space-y-4">
          <UsersTable
            rows={users.data}
            loading={users.isLoading}
            error={users.error}
            onRetry={() => users.refetch()}
            onAction={(a, u) => setAction({ a, u })}
            onActivity={(u) => {
              setActivity(u)
              setActivityOpen(true)
            }}
          />
          <Callout tone="info">
            Your own row is read-only here so you can’t lock yourself out. Change your password or two-factor settings on the Account page. Role changes and disabling sign the person out
            everywhere.
          </Callout>
        </div>
      ) : (
        <RolesMatrix />
      )}

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <UserDialogs action={action?.a ?? null} target={target} onClose={() => setAction(null)} />
      <UserActivityDrawer user={activity} open={activityOpen} onClose={() => setActivityOpen(false)} />
    </div>
  )
}
