import { useMemo } from 'react'
import { Briefcase, Code2, Download, MousePointerClick } from 'lucide-react'
import { RangePicker, useRange } from '../../components/analytics/RangePicker'
import { ErrorState, PageHeader, StatCard } from '../../components/ui'
import { fmtDate } from '../../lib/format'
import { useOverview, useProjectStats } from './api'
import { Journeys } from './Journeys'
import { ProjectPerformance } from './ProjectPerformance'

export default function EngagementAnalyticsPage() {
  const { range, setRange, query } = useRange('30d')
  const projects = useProjectStats(query)
  const overview = useOverview(query)
  const titles = useMemo(() => new Map((projects.data?.items ?? []).map((p) => [p.slug, p.title])), [projects.data])
  const c = overview.data?.clicks
  const r = projects.data?.range ?? overview.data?.range

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Analytics"
        title="Engagement"
        description={
          r
            ? `How visitors interacted with projects and links, ${fmtDate(r.from)} – ${fmtDate(r.to)}.`
            : 'How visitors interacted with projects and links.'
        }
        actions={<RangePicker range={range} onChange={setRange} />}
      />

      <section aria-label="Outbound clicks" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {overview.isError ? (
          <ErrorState className="sm:col-span-2 xl:col-span-4" error={overview.error} onRetry={() => overview.refetch()} title="Could not load click totals" />
        ) : (
          <>
            <StatCard label="GitHub clicks" icon={<Code2 className="h-4 w-4" />} loading={overview.isPending} value={c?.github} info="Clicks on GitHub profile or repository links anywhere on the site." />
            <StatCard label="LinkedIn clicks" icon={<Briefcase className="h-4 w-4" />} loading={overview.isPending} value={c?.linkedin} info="Clicks on LinkedIn links." />
            <StatCard label="Résumé downloads" icon={<Download className="h-4 w-4" />} loading={overview.isPending} value={c?.resume} info="Résumé download clicks." />
            <StatCard label="CTA clicks" icon={<MousePointerClick className="h-4 w-4" />} loading={overview.isPending} value={c?.cta} info="Clicks on call-to-action buttons (e.g. hero and contact prompts)." />
          </>
        )}
      </section>

      <ProjectPerformance
        items={projects.data?.items}
        loading={projects.isPending}
        error={projects.error}
        onRetry={() => projects.refetch()}
      />

      <Journeys query={query} titles={titles} />

      {overview.data && <p className="text-xs text-dim">{overview.data.definitions.accuracy}</p>}
    </div>
  )
}
