import { Check, Minus } from 'lucide-react'
import { PERMISSIONS } from '@pg/shared'
import { Card, CardHeader, ErrorState, SkeletonRows } from '../../components/ui'
import { RoleBadge } from '../../components/admin/shared'
import { useRoles } from './usersApi'

/** Read-only permission × role grid, as stored in the database. */
export function RolesMatrix() {
  const q = useRoles()
  const roles = q.data ?? []
  const keys = [...new Set([...PERMISSIONS, ...roles.flatMap((r) => r.permissions)])]

  return (
    <Card>
      <CardHeader title="Roles & permissions" description="What each role can do. Roles are fixed; assign a role to change someone’s access." />
      {q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : q.isLoading ? (
        <SkeletonRows rows={8} />
      ) : (
        <div className="scroll-thin -mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[520px] border-collapse text-[13px]">
            <caption className="sr-only">Permissions granted to each role</caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="sticky left-0 bg-card py-2 pr-3 text-left font-mono text-[10.5px] font-medium uppercase tracking-wider text-muted">
                  Permission
                </th>
                {roles.map((r) => (
                  <th key={r.name} scope="col" className="px-2 py-2 text-center align-bottom">
                    <div className="flex flex-col items-center gap-1">
                      <RoleBadge role={r.name} label={r.label} />
                      <span className="text-[11px] font-normal text-dim">{r.users} user{r.users === 1 ? '' : 's'}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys.map((p, i) => {
                const group = p.split(':')[0]
                const newGroup = i > 0 && keys[i - 1].split(':')[0] !== group
                return (
                  <tr key={p} className={newGroup ? 'border-t border-line' : undefined}>
                    <th scope="row" className="sticky left-0 bg-card py-1.5 pr-3 text-left font-mono text-[12px] font-normal text-[#c9ced8]">
                      {p}
                    </th>
                    {roles.map((r) => {
                      const has = r.permissions.includes(p)
                      return (
                        <td key={r.name} className="px-2 py-1.5 text-center">
                          {has ? (
                            <Check className="mx-auto h-4 w-4 text-emerald-300" aria-label="Granted" />
                          ) : (
                            <Minus className="mx-auto h-3.5 w-3.5 text-white/15" aria-label="Not granted" />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
