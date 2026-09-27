import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { UserRound } from 'lucide-react'
import { ROLE_LABELS } from '@pg/shared'
import { useUser } from '../../lib/auth'
import { Card, CardHeader, KeyValue, PageHeader } from '../../components/ui'
import { RoleBadge } from '../../components/admin/shared'
import { ChangePasswordCard } from './ChangePasswordCard'
import { TwoFactorCard } from './TwoFactorCard'

export default function AccountPage() {
  const user = useUser()
  const { hash } = useLocation()

  // The account menu links to #password and #2fa.
  useEffect(() => {
    if (!hash) return
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    return () => clearTimeout(t)
  }, [hash])

  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

  return (
    <div>
      <PageHeader title="Account" description="Your profile, password and two-factor authentication." />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-muted" /> Profile
              </span>
            }
            description="Ask a Super Admin to change your role or email."
          />
          <div className="mb-5 flex items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-line-2 bg-accent/15 text-lg font-semibold text-violet-200" aria-hidden>
              {initials || '?'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-fg">{user.name}</p>
              <p className="truncate text-sm text-muted">{user.email}</p>
            </div>
          </div>
          <KeyValue
            items={[
              ['Role', <RoleBadge key="r" role={user.role} label={ROLE_LABELS[user.role]} />],
              ['Two-factor', user.twoFactorEnabled ? 'Enabled' : 'Not enabled'],
              ['Permissions', `${user.permissions.length} granted`],
            ]}
          />
          <details className="mt-4">
            <summary className="cursor-pointer text-xs text-muted hover:text-fg">Show my permissions</summary>
            <ul className="mt-2 flex flex-wrap gap-1">
              {user.permissions.map((p) => (
                <li key={p} className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-[#c9ced8]">
                  {p}
                </li>
              ))}
            </ul>
          </details>
        </Card>
        <div className="space-y-5">
          <TwoFactorCard />
          <ChangePasswordCard />
        </div>
      </div>
    </div>
  )
}
