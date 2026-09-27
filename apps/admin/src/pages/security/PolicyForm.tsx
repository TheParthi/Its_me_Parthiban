import { KeyRound } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import type { SecurityOverview } from '../../lib/types'
import { Card, CardHeader, KeyValue, Switch } from '../../components/ui'
import { useSettingsSection } from '../settings/settingsApi'
import { NumField, SettingsCard } from '../settings/SettingsSection'

function EditablePolicy({ canWrite, reason }: { canWrite: boolean; reason?: string }) {
  const s = useSettingsSection('security')
  const e = s.errors
  return (
    <SettingsCard
      s={s}
      title="Login & session policy"
      icon={<KeyRound className="h-4 w-4" />}
      description="Applies to all administrators. Changes take effect on the next sign-in or token refresh."
      canWrite={canWrite}
      writeReason={reason}
    >
      {(d) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumField label="Access token lifetime" unit="minutes" min={5} max={60} value={d.accessTokenMinutes} onChange={(v) => s.set('accessTokenMinutes', v)} error={e.accessTokenMinutes} />
            <NumField
              label="“Remember me” session length"
              unit="days"
              min={1}
              max={90}
              value={d.sessionDays}
              onChange={(v) => s.set('sessionDays', v)}
              error={e.sessionDays}
              hint="1–90 days. Sessions without “remember me” last 12 hours."
            />
            <NumField label="Failed logins before lockout" min={3} max={20} value={d.maxFailedLogins} onChange={(v) => s.set('maxFailedLogins', v)} error={e.maxFailedLogins} />
            <NumField label="Lockout duration" unit="minutes" min={1} max={1440} value={d.lockoutMinutes} onChange={(v) => s.set('lockoutMinutes', v)} error={e.lockoutMinutes} />
          </div>
          <Switch
            label="Require two-factor authentication"
            description="Administrators without 2FA are prompted to set it up after signing in."
            checked={d.enforce2fa}
            onChange={(v) => s.set('enforce2fa', v)}
          />
        </>
      )}
    </SettingsCard>
  )
}

/** Editable when the user can read settings; otherwise shows the policy from the overview. */
export function PolicyForm({ policy }: { policy: SecurityOverview['policy'] | undefined }) {
  const { can } = useAuth()
  const canWrite = can('security:write') && can('settings:write')
  const reason = canWrite ? undefined : 'Requires security:write and settings:write'
  if (can('settings:read')) return <EditablePolicy canWrite={canWrite} reason={reason} />
  return (
    <Card>
      <CardHeader title="Login & session policy" description="Read-only — requires settings access to change." />
      {policy ? (
        <KeyValue
          items={[
            ['Access token', `${policy.accessTokenMinutes} min`],
            ['Session length', `${policy.sessionDays} days`],
            ['Lockout after', `${policy.maxFailedLogins} failed logins`],
            ['Lockout duration', `${policy.lockoutMinutes} min`],
            ['Enforce 2FA', policy.enforce2fa ? 'Yes' : 'No'],
          ]}
        />
      ) : (
        <p className="text-sm text-muted">Loading…</p>
      )}
    </Card>
  )
}
