import { useState } from 'react'
import { ChevronDown, History } from 'lucide-react'
import type { AdminUserRow } from '../../lib/types'
import { cn, fmtDateTime } from '../../lib/format'
import { Drawer, EmptyState, ErrorState, SkeletonRows } from '../../components/ui'
import { JsonBlock, Mono, SuccessBadge } from '../../components/admin/shared'
import { useUserActivity } from './usersApi'

export function UserActivityDrawer({ user, open, onClose }: { user: AdminUserRow | null; open: boolean; onClose: () => void }) {
  const q = useUserActivity(user?.id ?? null, open)
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <Drawer open={open} onClose={onClose} title={user ? `Activity · ${user.name}` : 'Activity'} description={user ? `Last 50 actions by ${user.email}` : undefined}>
      {q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : q.isLoading || !q.data ? (
        <SkeletonRows rows={8} />
      ) : !q.data.length ? (
        <EmptyState compact icon={<History className="h-5 w-5" />} title="No activity recorded" description="Actions this user takes in the admin will appear here." />
      ) : (
        <ol className="space-y-2">
          {q.data.map((r) => {
            const isOpen = expanded === r.id
            const hasMeta = r.metadata !== null && r.metadata !== undefined
            return (
              <li key={r.id} className="rounded-lg border border-line bg-card">
                <button
                  type="button"
                  className="flex w-full items-start gap-3 px-3 py-2.5 text-left disabled:cursor-default"
                  onClick={() => setExpanded(isOpen ? null : r.id)}
                  aria-expanded={hasMeta ? isOpen : undefined}
                  disabled={!hasMeta}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Mono className="text-fg">{r.action}</Mono>
                      {!r.success && <SuccessBadge success={false} />}
                    </div>
                    <div className="mt-0.5 text-xs text-muted">
                      {fmtDateTime(r.createdAt)}
                      {r.resourceType && ` · ${r.resourceType}${r.resourceId ? ` ${r.resourceId.slice(0, 10)}` : ''}`}
                      {r.ipPrefix && ` · ${r.ipPrefix}`}
                    </div>
                  </div>
                  {hasMeta && <ChevronDown className={cn('mt-0.5 h-4 w-4 shrink-0 text-dim transition-transform', isOpen && 'rotate-180')} aria-hidden />}
                </button>
                {isOpen && hasMeta && <JsonBlock value={r.metadata} className="mx-3 mb-3" />}
              </li>
            )
          })}
        </ol>
      )}
    </Drawer>
  )
}
