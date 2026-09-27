import { BarChart3, FileClock, Mail } from 'lucide-react'
import { Switch } from '../../components/ui'
import { usePerm } from '../../components/admin/shared'
import { useSettingsSection } from './settingsApi'
import { NumField, SettingsCard } from './SettingsSection'

export function AnalyticsSettings() {
  const s = useSettingsSection('analytics')
  const w = usePerm('settings:write')
  const e = s.errors
  return (
    <SettingsCard s={s} title="Analytics" icon={<BarChart3 className="h-4 w-4" />} description="Privacy-first visitor analytics on your public site." canWrite={w.allowed} writeReason={w.reason}>
      {(d) => (
        <>
          <Switch label="Collect analytics" description="Record anonymous page views and events from the portfolio." checked={d.enabled} onChange={(v) => s.set('enabled', v)} />
          <Switch
            label="Require consent"
            description="Ask visitors before setting a persistent visitor id. Without consent, visits are only counted per browser session."
            checked={d.requireConsent}
            onChange={(v) => s.set('requireConsent', v)}
          />
          <Switch label="Respect Do Not Track" description="Skip tracking for browsers that send a Do Not Track or opt-out signal." checked={d.respectDoNotTrack} onChange={(v) => s.set('respectDoNotTrack', v)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <NumField label="Keep raw data for" unit="days" min={7} max={730} value={d.retentionDays} onChange={(v) => s.set('retentionDays', v)} error={e.retentionDays} />
            <NumField label="“Live” window" unit="minutes" min={1} max={60} value={d.liveWindowMinutes} onChange={(v) => s.set('liveWindowMinutes', v)} error={e.liveWindowMinutes} />
          </div>
        </>
      )}
    </SettingsCard>
  )
}

export function ContactSettings() {
  const s = useSettingsSection('contact')
  const w = usePerm('settings:write')
  return (
    <SettingsCard s={s} title="Contact form" icon={<Mail className="h-4 w-4" />} description="How messages from your portfolio are accepted and kept." canWrite={w.allowed} writeReason={w.reason}>
      {(d) => (
        <>
          <Switch label="Accept messages" description="When off, the public contact form reports that it’s closed." checked={d.enabled} onChange={(v) => s.set('enabled', v)} />
          <Switch
            label="Email me new messages"
            description="Sends a notification to the server’s NOTIFY_EMAIL address. Requires SMTP to be configured."
            checked={d.notifyByEmail}
            onChange={(v) => s.set('notifyByEmail', v)}
          />
          <NumField label="Delete messages after" unit="days" min={30} max={3650} value={d.retentionDays} onChange={(v) => s.set('retentionDays', v)} error={s.errors.retentionDays} />
        </>
      )}
    </SettingsCard>
  )
}

export function AuditSettings() {
  const s = useSettingsSection('audit')
  const w = usePerm('settings:write')
  return (
    <SettingsCard s={s} title="Audit log" icon={<FileClock className="h-4 w-4" />} description="How long the activity log is retained." canWrite={w.allowed} writeReason={w.reason}>
      {(d) => <NumField label="Keep audit entries for" unit="days" min={90} max={3650} value={d.retentionDays} onChange={(v) => s.set('retentionDays', v)} error={s.errors.retentionDays} />}
    </SettingsCard>
  )
}
