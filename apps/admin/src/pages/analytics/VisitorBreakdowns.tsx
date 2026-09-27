import { useState } from 'react'
import type { AnalyticsOverview } from '@pg/shared'
import { ChartCard, Donut, RankedBars, RankedList } from '../../components/charts'
import { EmptyState, InfoTip, Segmented } from '../../components/ui'
import { CountriesBody } from '../overview/OverviewCharts'
import { useSources } from './api'
import { deviceLabel, pathLabel, sourceLabel } from './format'
import type { QueryValue } from '../../lib/api'

type Tech = 'devices' | 'browsers' | 'os'
type Src = 'sources' | 'referrers' | 'campaigns'

export function TopPagesCard({ data }: { data: AnalyticsOverview }) {
  return (
    <ChartCard title="Top pages" description="Page views by path" empty={!data.topPages.length}>
      <RankedList
        items={data.topPages}
        label="Page"
        formatKey={(k) => (
          <span className="flex items-baseline gap-2">
            <span>{pathLabel(k)}</span>
            <span className="truncate font-mono text-[11px] text-dim">{k}</span>
          </span>
        )}
      />
    </ChartCard>
  )
}

export function TechCard({ data }: { data: AnalyticsOverview }) {
  const [tab, setTab] = useState<Tech>('devices')
  const items = data[tab]
  return (
    <ChartCard
      title="Technology"
      description="Sessions by device, browser and OS"
      actions={
        <Segmented
          size="sm"
          aria-label="Technology breakdown"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'devices', label: 'Device' },
            { value: 'browsers', label: 'Browser' },
            { value: 'os', label: 'OS' },
          ]}
        />
      }
    >
      {items.length ? (
        <Donut ariaLabel={`Sessions by ${tab}`} items={items} centerLabel="sessions" formatKey={tab === 'devices' ? deviceLabel : undefined} />
      ) : (
        <EmptyState compact title="No sessions in this period" />
      )}
    </ChartCard>
  )
}

export function SourcesCard({ query, definition }: { query: Record<string, QueryValue>; definition?: string }) {
  const [tab, setTab] = useState<Src>('sources')
  const q = useSources(query)
  const items = q.data?.[tab] ?? []
  const emptyText: Record<Src, string> = {
    sources: 'No sessions in this period.',
    referrers: 'No visits came from another website — direct and internal visits have no referrer domain.',
    campaigns: 'No visits carried UTM campaign tags.',
  }
  return (
    <ChartCard
      title={
        <span className="flex items-center gap-1.5">
          Acquisition {definition && <InfoTip>{definition}</InfoTip>}
        </span>
      }
      description="Where visits came from"
      loading={q.isPending}
      error={q.error}
      onRetry={() => q.refetch()}
      actions={
        <Segmented
          size="sm"
          aria-label="Acquisition breakdown"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'sources', label: 'Sources' },
            { value: 'referrers', label: 'Referrers' },
            { value: 'campaigns', label: 'Campaigns' },
          ]}
        />
      }
      empty={!items.length}
      emptyTitle={`No ${tab}`}
      emptyDescription={emptyText[tab]}
    >
      {tab === 'sources' ? (
        <RankedBars ariaLabel="Sessions by source" items={items} label="Sessions" formatKey={sourceLabel} labelWidth={80} />
      ) : (
        <RankedList items={items} label={tab === 'referrers' ? 'Domain' : 'Campaign'} max={15} mono={tab === 'referrers'} />
      )}
    </ChartCard>
  )
}

export function CountriesCard({ data }: { data: AnalyticsOverview }) {
  return (
    <ChartCard title="Countries" description="Sessions by visitor country">
      <CountriesBody items={data.countries} />
    </ChartCard>
  )
}
