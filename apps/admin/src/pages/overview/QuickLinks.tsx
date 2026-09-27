import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, BarChart3, FolderKanban, Inbox, MousePointerClick } from 'lucide-react'
import { get } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { cn } from '../../lib/format'
import { Badge, Card, CardHeader, Skeleton } from '../../components/ui'

function useNewMessages(enabled: boolean) {
  return useQuery({
    queryKey: ['messages', 'new-count'],
    enabled,
    staleTime: 30_000,
    queryFn: ({ signal }) => get<{ total: number }>('/admin/messages', { status: 'NEW', pageSize: 1 }, signal),
  })
}

function QuickLink({ to, icon, title, hint, badge }: { to: string; icon: ReactNode; title: string; hint: string; badge?: ReactNode }) {
  return (
    <Link
      to={to}
      className={cn(
        'group flex items-center gap-3 rounded-lg border border-line bg-white/[0.02] px-3.5 py-3 transition-colors',
        'hover:border-line-2 hover:bg-white/[0.05]',
      )}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-white/[0.03] text-muted group-hover:text-fg">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-medium text-fg">
          {title}
          {badge}
        </span>
        <span className="block truncate text-xs text-muted">{hint}</span>
      </span>
      <ArrowUpRight className="h-4 w-4 text-dim group-hover:text-fg" aria-hidden />
    </Link>
  )
}

export function QuickLinks() {
  const { can } = useAuth()
  const canMessages = can('messages:read')
  const msgs = useNewMessages(canMessages)
  const links: ReactNode[] = []
  if (canMessages) {
    const badge = msgs.isPending ? (
      <Skeleton className="h-4 w-10" />
    ) : msgs.isError ? (
      <Badge tone="rose">error</Badge>
    ) : msgs.data.total > 0 ? (
      <Badge tone="cyan" dot>
        {msgs.data.total} new
      </Badge>
    ) : (
      <Badge tone="gray">0 new</Badge>
    )
    links.push(<QuickLink key="m" to="/messages" icon={<Inbox className="h-4 w-4" />} title="Messages" hint="Contact form inbox" badge={badge} />)
  }
  if (can('content:read'))
    links.push(<QuickLink key="p" to="/projects" icon={<FolderKanban className="h-4 w-4" />} title="Projects" hint="Edit, publish and reorder" />)
  if (can('analytics:read')) {
    links.push(<QuickLink key="v" to="/analytics/visitors" icon={<BarChart3 className="h-4 w-4" />} title="Visitor analytics" hint="Sessions, sources, live visitors" />)
    links.push(<QuickLink key="e" to="/analytics/engagement" icon={<MousePointerClick className="h-4 w-4" />} title="Engagement" hint="Project performance and journeys" />)
  }
  if (!links.length) return null
  return (
    <Card>
      <CardHeader title="Quick links" />
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{links}</div>
    </Card>
  )
}
