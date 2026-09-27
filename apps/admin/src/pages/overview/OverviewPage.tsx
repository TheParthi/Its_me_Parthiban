import { useMemo } from 'react'
import { Activity, Lock } from 'lucide-react'
import { RangePicker, useRange } from '../../components/analytics/RangePicker'
import { Callout, EmptyState, ErrorState, PageHeader } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { fmtDate } from '../../lib/format'
import { useOverview, useProjectStats } from '../analytics/api'
import { isEmptyOverview } from '../analytics/format'
import { OverviewCharts } from './OverviewCharts'
import { AnalyticsStatCards, ProjectCountCards } from './OverviewStats'
import { QuickLinks } from './QuickLinks'

export default function OverviewPage() {
  const { user, can } = useAuth()
  const canAnalytics = can('analytics:read')
  const canContent = can('content:read')
  const { range, setRange, query } = useRange('7d')
  const overview = useOverview(query, canAnalytics)
  const projects = useProjectStats(query, canAnalytics)
  const titles = useMemo(() => new Map((projects.data?.items ?? []).map((p) => [p.slug, p.title])), [projects.data])
  const data = overview.data
  const empty = data ? isEmptyOverview(data) : false
  const first = user?.name?.split(' ')[0]

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Control center"
        title={first ? `Welcome back, ${first}` : 'Overview'}
        description={
          canAnalytics && data
            ? `Portfolio performance ${fmtDate(data.range.from)} – ${fmtDate(data.range.to)}, compared with the previous period of equal length.`
            : 'Your portfolio at a glance.'
        }
        actions={canAnalytics && <RangePicker range={range} onChange={setRange} />}
      />

      {(canAnalytics || canContent) && (
        <section aria-label="Key metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {canAnalytics && !overview.isError && <AnalyticsStatCards data={data} loading={overview.isPending} />}
          {canContent && <ProjectCountCards />}
        </section>
      )}

      <QuickLinks />

      {!canAnalytics ? (
        <Callout icon={<Lock className="mt-0.5 h-4 w-4 shrink-0" />} title="Analytics hidden">
          Your role does not include analytics access. Ask an administrator for the “analytics:read” permission.
        </Callout>
      ) : overview.isError ? (
        <ErrorState error={overview.error} onRetry={() => overview.refetch()} title="Could not load analytics" />
      ) : overview.isPending ? (
        <div className="grid gap-4 lg:grid-cols-3" aria-busy="true" aria-label="Loading charts">
          <div className="skeleton h-80 rounded-xl lg:col-span-3" />
          <div className="skeleton h-64 rounded-xl lg:col-span-2" />
          <div className="skeleton h-64 rounded-xl" />
        </div>
      ) : empty ? (
        <EmptyState
          icon={<Activity className="h-5 w-5" />}
          title="No visitor data yet — analytics start once the public site sends events"
          description="Nothing was recorded in this period. Try a longer range, or check that the public site is deployed with analytics enabled. Numbers are approximate: ad blockers and consent choices hide some visitors."
        />
      ) : (
        data && (
          <>
            <OverviewCharts data={data} titles={titles} />
            <p className="text-xs text-dim">{data.definitions.accuracy}</p>
          </>
        )
      )}
    </div>
  )
}
