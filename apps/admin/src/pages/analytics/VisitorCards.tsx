import { Clock, Eye, Gauge, UserPlus, Users, Waypoints } from 'lucide-react'
import type { AnalyticsOverview } from '@pg/shared'
import { Card, InfoTip, Skeleton, StatCard } from '../../components/ui'
import { PALETTE } from '../../components/charts'
import { fmtDuration, fmtNumber, fmtPercent } from '../../lib/format'

function NewVsReturning({ data, loading }: { data?: AnalyticsOverview; loading: boolean }) {
  const n = data?.cards.newVisitors.value ?? 0
  const r = data?.cards.returningVisitors.value ?? 0
  const total = n + r
  const share = total ? n / total : 0
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[13px] text-muted">
          New vs returning
          {data && (
            <InfoTip>
              <strong className="font-medium text-fg">New:</strong> {data.definitions.newVisitors}
              <br />
              <strong className="font-medium text-fg">Returning:</strong> {data.definitions.returningVisitors}
            </InfoTip>
          )}
        </span>
        <UserPlus className="h-4 w-4 text-dim" aria-hidden />
      </div>
      {loading ? (
        <Skeleton className="h-8 w-28" />
      ) : (
        <div className="flex items-baseline gap-2 font-display text-[28px] font-semibold leading-none tracking-tight text-fg">
          {fmtNumber(n)}
          <span className="text-base font-normal text-dim">/</span>
          <span className="text-[22px] text-muted">{fmtNumber(r)}</span>
        </div>
      )}
      <div>
        <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-white/5" aria-hidden>
          {total > 0 && (
            <>
              <span className="rounded-full" style={{ width: `${share * 100}%`, background: PALETTE[0] }} />
              <span className="flex-1 rounded-full" style={{ background: PALETTE[1] }} />
            </>
          )}
        </div>
        <div className="mt-1.5 flex justify-between text-xs text-dim">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm" style={{ background: PALETTE[0] }} aria-hidden />
            New {total ? fmtPercent(share, 0) : ''}
          </span>
          <span className="flex items-center gap-1">
            Returning {total ? fmtPercent(1 - share, 0) : ''}
            <span className="h-2 w-2 rounded-sm" style={{ background: PALETTE[1] }} aria-hidden />
          </span>
        </div>
      </div>
    </Card>
  )
}

export function VisitorCards({ data, loading }: { data?: AnalyticsOverview; loading: boolean }) {
  const card = (k: keyof AnalyticsOverview['cards']) => ({
    value: data?.cards[k].value,
    previous: data ? data.cards[k].previous : undefined,
    info: data?.definitions[k],
    loading,
  })
  return (
    <section aria-label="Visitor metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <StatCard label="Sessions" icon={<Waypoints className="h-4 w-4" />} {...card('sessions')} />
      <StatCard label="Unique visitors" icon={<Users className="h-4 w-4" />} {...card('uniqueVisitors')} />
      <NewVsReturning data={data} loading={loading} />
      <StatCard label="Page views" icon={<Eye className="h-4 w-4" />} {...card('pageViews')} />
      <StatCard label="Avg session duration" icon={<Clock className="h-4 w-4" />} format={fmtDuration} {...card('avgEngagementSec')} />
      <StatCard label="Engagement rate" icon={<Gauge className="h-4 w-4" />} format={(v) => fmtPercent(v)} {...card('engagementRate')} />
    </section>
  )
}
