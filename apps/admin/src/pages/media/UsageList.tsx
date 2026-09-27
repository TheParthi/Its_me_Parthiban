import { Link } from 'react-router'
import { ArrowUpRight } from 'lucide-react'
import type { MediaUsage } from '../../lib/types'
import { Badge, EmptyState, ErrorState, SkeletonRows } from '../../components/ui'

const DOC_ROUTES: Record<string, string> = { profile: '/profile', homepage: '/homepage', appearance: '/appearance', seo: '/seo' }

export function usageHref(u: MediaUsage): string {
  switch (u.type) {
    case 'project':
      return `/projects/${u.id}`
    case 'skill':
      return '/skills'
    case 'document':
      return DOC_ROUTES[u.id] ?? '/portfolio'
    case 'certification':
    case 'achievement':
      return '/education'
    default:
      return '/portfolio'
  }
}

export function UsageList({ usage, loading, error, onRetry }: { usage: MediaUsage[] | undefined; loading: boolean; error: unknown; onRetry: () => void }) {
  if (error) return <ErrorState error={error} onRetry={onRetry} title="Could not check usage" />
  if (loading) return <SkeletonRows rows={2} />
  if (!usage?.length) return <EmptyState compact title="Not used anywhere" description="No draft or published content references this file." />
  return (
    <ul className="space-y-1.5">
      {usage.map((u) => (
        <li key={`${u.type}-${u.id}`}>
          <Link
            to={usageHref(u)}
            className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white/[0.02] px-3 py-2 text-[13px] hover:border-white/20"
          >
            <span className="min-w-0">
              <span className="mr-2 font-mono text-[10.5px] uppercase tracking-wider text-dim">{u.type}</span>
              <span className="truncate text-fg">{u.title}</span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <Badge tone={u.published ? 'emerald' : 'amber'}>{u.published ? 'Live' : 'Draft only'}</Badge>
              <ArrowUpRight className="h-3.5 w-3.5 text-muted" aria-hidden />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
