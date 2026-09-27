import { Link } from 'react-router'
import { PageHeader } from '../../components/ui'
import { AnalyticsSettings, AuditSettings, ContactSettings } from './SettingsForms'
import { BackupPanel } from './BackupPanel'
import { SystemPanel } from './SystemPanel'

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description={
          <>
            Site-wide behaviour for analytics, the contact form and logging. Session and login policy live on the{' '}
            <Link to="/security" className="text-violet-300 hover:underline">
              Security
            </Link>{' '}
            page.
          </>
        }
      />
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <div className="space-y-5">
          <AnalyticsSettings />
          <ContactSettings />
          <AuditSettings />
        </div>
        <div className="space-y-5">
          <SystemPanel />
        </div>
      </div>
      <div className="mt-5">
        <BackupPanel />
      </div>
    </div>
  )
}
