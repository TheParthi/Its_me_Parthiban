import { Globe2 } from 'lucide-react'
import type { AnalyticsOverview } from '@pg/shared'
import { PALETTE, AreaSeries, BarBreakdown, ChartCard, Donut, RankedBars, RankedList } from '../../components/charts'
import { EmptyState } from '../../components/ui'
import { bucketFormatters, deviceLabel, sourceLabel } from '../analytics/format'

export const COUNTRY_EMPTY =
  'Countries only appear when the hosting CDN adds a visitor-country header (for example Cloudflare or Vercel). No IP addresses are stored or looked up.'

export function CountriesBody({ items }: { items: { key: string; count: number }[] }) {
  if (!items.length)
    return <EmptyState compact icon={<Globe2 className="h-5 w-5" />} title="No country data" description={COUNTRY_EMPTY} />
  return <RankedList items={items} label="Country" max={12} />
}

export function OverviewCharts({ data, titles }: { data: AnalyticsOverview; titles: Map<string, string> }) {
  const f = bucketFormatters(data.range.bucket)
  const noSubmissions = data.series.every((s) => s.submissions === 0)
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <ChartCard
        className="lg:col-span-3"
        title="Visitor traffic"
        description={`Sessions and page views per ${data.range.bucket}`}
        empty={data.series.every((s) => s.sessions + s.pageViews === 0)}
      >
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
      </ChartCard>

      <ChartCard
        className="lg:col-span-2"
        title="Project popularity"
        description="Project detail views"
        empty={!data.topProjects.length}
        emptyDescription="No project was opened in this period."
      >
        <RankedBars
          ariaLabel="Project views by project"
          items={data.topProjects}
          label="Views"
          formatKey={(k) => titles.get(k) ?? k}
          labelWidth={140}
        />
      </ChartCard>

      <ChartCard title="Devices" description="Share of sessions" empty={!data.devices.length}>
        <Donut ariaLabel="Sessions by device type" items={data.devices} centerLabel="sessions" formatKey={deviceLabel} />
      </ChartCard>

      <ChartCard title="Traffic sources" description="How visits arrived" empty={!data.sources.length}>
        <RankedBars ariaLabel="Sessions by traffic source" items={data.sources} label="Sessions" formatKey={sourceLabel} labelWidth={80} />
      </ChartCard>

      <ChartCard title="Countries" description="Sessions by visitor country">
        <CountriesBody items={data.countries} />
      </ChartCard>

      <ChartCard
        title="Contact submissions"
        description={`Forms sent per ${data.range.bucket}`}
        empty={noSubmissions}
        emptyTitle="No contact forms sent"
        emptyDescription="Submissions reported by the public site will show here."
      >
        <BarBreakdown
          ariaLabel="Contact form submissions over time"
          layout="vertical"
          data={data.series}
          categoryKey="t"
          series={[{ key: 'submissions', label: 'Submissions', color: '#00D5FF' }]}
          formatCategory={f.tick}
          formatTooltipLabel={f.label}
          height={200}
        />
      </ChartCard>
    </div>
  )
}
