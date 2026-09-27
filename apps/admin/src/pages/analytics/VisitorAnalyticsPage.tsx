import { useMemo } from 'react'
import { Activity, Lock, ShieldCheck } from 'lucide-react'
import { RangePicker, useRange } from '../../components/analytics/RangePicker'
import { PALETTE, AreaSeries, ChartCard } from '../../components/charts'
import { Callout, Card, EmptyState, ErrorState, PageHeader } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { fmtDate } from '../../lib/format'
import { useOverview } from './api'
import { bucketFormatters, isEmptyOverview } from './format'
import { LiveVisitors } from './LiveVisitors'
import { SessionExplorer } from './SessionExplorer'
import { CountriesCard, SourcesCard, TechCard, TopPagesCard } from './VisitorBreakdowns'
import { VisitorCards } from './VisitorCards'
import { VisitorFilters, useFilters } from './VisitorFilters'

export default function VisitorAnalyticsPage() {
  const { can } = useAuth()
  const canSessions = can('analytics:sessions')
  const { range, setRange, query: rangeQuery } = useRange('30d')
  const { filters, setFilters, params, active, reset } = useFilters()
  const query = useMemo(() => ({ ...rangeQuery, ...params }), [rangeQuery, params])
  const overview = useOverview(query)
  const data = overview.data
  const empty = data ? isEmptyOverview(data) : false
  const f = data ? bucketFormatters(data.range.bucket) : null

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Analytics"
        title="Visitor analytics"
        description={
          data
            ? `Who visited ${fmtDate(data.range.from)} – ${fmtDate(data.range.to)}, how they arrived and what they looked at.`
            : 'Who visited, how they arrived and what they looked at.'
        }
        actions={<RangePicker range={range} onChange={setRange} />}
      />

      <Callout icon={<ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />} title="Privacy">
        Anonymous IDs identify browsers, not people. No IP addresses are stored. {data?.definitions.accuracy}
      </Callout>

      <Card>
        <VisitorFilters filters={filters} onChange={setFilters} active={active} onReset={reset} />
      </Card>

      {overview.isError ? (
        <ErrorState error={overview.error} onRetry={() => overview.refetch()} title="Could not load visitor analytics" />
      ) : (
        <>
          <VisitorCards data={data} loading={overview.isPending} />
          {data && empty ? (
            <EmptyState
              icon={<Activity className="h-5 w-5" />}
              title={active ? 'No visits match these filters' : 'No visitor data yet — analytics start once the public site sends events'}
              description={active ? 'Try clearing a filter or choosing a longer range.' : 'Nothing was recorded in this period. Try a longer range.'}
              action={active ? <button className="text-sm text-accent-2 hover:underline" onClick={reset}>Clear filters</button> : undefined}
            />
          ) : (
            <>
              <ChartCard
                title="Traffic"
                description={data ? `Sessions and page views per ${data.range.bucket}` : undefined}
                loading={overview.isPending}
                skeletonHeight={280}
              >
                {data && f && (
                  <AreaSeries
                    ariaLabel="Sessions and page views over time"
                    data={data.series}
                    xKey="t"
                    series={[
                      { key: 'sessions', label: 'Sessions', color: PALETTE[1] },
                      { key: 'pageViews', label: 'Page views', color: PALETTE[0] },
                    ]}
                    formatX={f.tick}
                    formatTooltipLabel={f.label}
                    height={280}
                  />
                )}
              </ChartCard>
              {data && (
                <div className="grid gap-4 lg:grid-cols-2">
                  <TopPagesCard data={data} />
                  <TechCard data={data} />
                  <SourcesCard query={query} definition={data.definitions.sources} />
                  <CountriesCard data={data} />
                </div>
              )}
            </>
          )}
        </>
      )}

      {canSessions ? (
        <div className="space-y-4">
          <LiveVisitors />
          <SessionExplorer />
        </div>
      ) : (
        <Callout icon={<Lock className="mt-0.5 h-4 w-4 shrink-0" />} title="Session explorer and live visitors are hidden">
          They need the “analytics:sessions” permission.
        </Callout>
      )}
    </div>
  )
}
