import { useEffect, useMemo, useState } from 'react'
import { BarBreakdown, ChartCard, PALETTE } from '../../components/charts'
import { Card, CardHeader, DataTable, EmptyState, type Column } from '../../components/ui'
import { fmtDuration, fmtNumber, fmtPercent } from '../../lib/format'
import type { ProjectStat } from './api'

const MAX = 4

const num = (n: number) => <span className="font-mono text-xs text-muted">{fmtNumber(n)}</span>

const columns: Column<ProjectStat>[] = [
  {
    key: 'project',
    header: 'Project',
    primary: true,
    value: (p) => p.title,
    cell: (p) => (
      <span className="min-w-0">
        <span className="block truncate font-medium text-fg">{p.title}</span>
        <span className="block truncate font-mono text-[11px] text-dim">{p.slug}</span>
      </span>
    ),
  },
  { key: 'views', header: 'Views', cell: (p) => <span className="font-mono text-xs text-fg">{fmtNumber(p.views)}</span> },
  { key: 'sessions', header: 'Unique sessions', cell: (p) => num(p.uniqueSessions) },
  {
    key: 'eng',
    header: 'Avg engagement',
    cell: (p) => <span className="font-mono text-xs text-muted">{p.avgEngagementSec == null ? '—' : fmtDuration(p.avgEngagementSec)}</span>,
  },
  { key: 'gh', header: 'GitHub clicks', cell: (p) => num(p.githubClicks) },
  { key: 'demo', header: 'Demo clicks', cell: (p) => num(p.demoClicks) },
  { key: 'other', header: 'Other clicks', hideOnMobile: true, cell: (p) => num(p.otherClicks) },
  {
    key: 'ctr',
    header: 'CTR',
    cell: (p) => <span className="font-mono text-xs text-fg">{p.ctr == null ? '—' : fmtPercent(p.ctr)}</span>,
  },
]

const METRICS: { key: keyof ProjectStat; label: string }[] = [
  { key: 'views', label: 'Views' },
  { key: 'uniqueSessions', label: 'Unique sessions' },
  { key: 'githubClicks', label: 'GitHub' },
  { key: 'demoClicks', label: 'Demo' },
  { key: 'otherClicks', label: 'Other clicks' },
]

/** Selected slugs → palette slot; a project keeps its colour while selected. */
function useComparison(items: ProjectStat[] | undefined) {
  const [slots, setSlots] = useState<Record<string, number> | null>(null)
  useEffect(() => {
    if (slots || !items) return
    const init: Record<string, number> = {}
    items.filter((p) => p.views > 0).slice(0, MAX).forEach((p, i) => (init[p.slug] = i))
    setSlots(init)
  }, [items, slots])
  const current = slots ?? {}
  const set = (next: Set<string>) => {
    const out: Record<string, number> = {}
    for (const slug of Object.keys(current)) if (next.has(slug)) out[slug] = current[slug]
    for (const slug of next) {
      if (slug in out) continue
      if (Object.keys(out).length >= MAX) break
      const used = new Set(Object.values(out))
      out[slug] = [0, 1, 2, 3].find((i) => !used.has(i)) ?? 0
    }
    setSlots(out)
  }
  return { slots: current, selected: new Set(Object.keys(current)), set }
}

export function ProjectPerformance({ items, loading, error, onRetry }: { items?: ProjectStat[]; loading: boolean; error: unknown; onRetry: () => void }) {
  const { slots, selected, set } = useComparison(items)
  const chosen = useMemo(() => (items ?? []).filter((p) => p.slug in slots), [items, slots])
  const chart = useMemo(
    () => METRICS.map((m) => Object.fromEntries([['metric', m.label], ...chosen.map((p) => [p.slug, p[m.key] as number])])),
    [chosen],
  )
  return (
    <>
      <Card>
        <CardHeader
          title="Project performance"
          description={`Tick up to ${MAX} projects to compare them below. CTR = link clicks ÷ project views.`}
        />
        <DataTable
          caption="Project engagement"
          columns={columns}
          rows={items}
          getRowId={(p) => p.slug}
          loading={loading}
          error={error}
          onRetry={onRetry}
          selectable
          selected={selected}
          onSelectedChange={set}
          searchable
          pageSize={10}
          searchPlaceholder="Filter projects…"
          empty={<EmptyState compact title="No projects yet" description="Create a project to see its engagement here." />}
        />
        {selected.size >= MAX && <p className="mt-2 text-xs text-dim">Comparison is limited to {MAX} projects — untick one to add another.</p>}
      </Card>
      <ChartCard
        title="Compare projects"
        description="Views, sessions and link clicks side by side"
        loading={loading}
        empty={!chosen.length}
        emptyTitle="Select projects to compare"
        emptyDescription="Tick projects in the table above."
      >
        <BarBreakdown
          ariaLabel={`Comparison of ${chosen.map((p) => p.title).join(', ')}`}
          layout="vertical"
          data={chart}
          categoryKey="metric"
          series={chosen.map((p) => ({ key: p.slug, label: p.title, color: PALETTE[slots[p.slug]] }))}
          height={260}
        />
      </ChartCard>
    </>
  )
}
