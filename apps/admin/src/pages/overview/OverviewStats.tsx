import type { ReactNode } from 'react'
import { Clock, Eye, FileText, FolderKanban, Mail, MousePointerClick, PenLine, Users, Waypoints } from 'lucide-react'
import type { AnalyticsOverview } from '@pg/shared'
import { StatCard } from '../../components/ui'
import { fmtDuration } from '../../lib/format'
import { useProjects } from '../../lib/queries'

type CardKey = keyof AnalyticsOverview['cards']

const CARDS: { key: CardKey; label: string; icon: ReactNode; format?: (n: number) => string }[] = [
  { key: 'sessions', label: 'Sessions', icon: <Waypoints className="h-4 w-4" /> },
  { key: 'uniqueVisitors', label: 'Unique visitors', icon: <Users className="h-4 w-4" /> },
  { key: 'pageViews', label: 'Page views', icon: <Eye className="h-4 w-4" /> },
  { key: 'projectViews', label: 'Project views', icon: <MousePointerClick className="h-4 w-4" /> },
  { key: 'avgEngagementSec', label: 'Avg engagement time', icon: <Clock className="h-4 w-4" />, format: fmtDuration },
  { key: 'contactSubmissions', label: 'Contact submissions', icon: <Mail className="h-4 w-4" /> },
]

export function AnalyticsStatCards({ data, loading }: { data?: AnalyticsOverview; loading: boolean }) {
  return (
    <>
      {CARDS.map((c) => (
        <StatCard
          key={c.key}
          label={c.label}
          icon={c.icon}
          loading={loading}
          value={data?.cards[c.key].value}
          previous={data ? data.cards[c.key].previous : undefined}
          format={c.format}
          info={data?.definitions[c.key]}
        />
      ))}
    </>
  )
}

/** Published / draft counts. Only mounted when the user has content:read. */
export function ProjectCountCards() {
  const q = useProjects()
  const items = q.data ?? []
  const published = items.filter((p) => p.status === 'PUBLISHED').length
  const drafts = items.filter((p) => p.status === 'DRAFT').length
  const err = q.isError ? 'Could not load projects' : undefined
  return (
    <>
      <StatCard
        label="Published projects"
        icon={<FolderKanban className="h-4 w-4" />}
        loading={q.isPending}
        value={q.isError ? null : published}
        footer={err && <span className="text-xs text-rose-300">{err}</span>}
      />
      <StatCard
        label="Draft projects"
        icon={q.isError ? <FileText className="h-4 w-4" /> : <PenLine className="h-4 w-4" />}
        loading={q.isPending}
        value={q.isError ? null : drafts}
        footer={err && <span className="text-xs text-rose-300">{err}</span>}
      />
    </>
  )
}
