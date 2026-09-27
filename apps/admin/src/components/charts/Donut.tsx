import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { fmtNumber } from '../../lib/format'
import { CHART, colorAt, foldOther, OTHER_COLOR } from './palette'
import { ChartTooltip } from './ChartTooltip'

export interface DonutProps {
  items: { key: string; count: number }[]
  /** Label under the centre total, e.g. "sessions". */
  centerLabel?: string
  formatKey?: (k: string) => string
  size?: number
  ariaLabel: string
}

/** Part-to-whole ring with a legend listing share and count. */
export function Donut({ items, centerLabel, formatKey = (k) => k, size = 168, ariaLabel }: DonutProps) {
  const data = foldOther(items).map((d, i) => ({
    ...d,
    name: formatKey(d.key),
    color: d.key === 'Other' ? OTHER_COLOR : colorAt(i),
  }))
  const total = data.reduce((n, d) => n + d.count, 0)
  return (
    <figure role="img" aria-label={ariaLabel} className="m-0 flex flex-wrap items-center justify-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="name"
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={data.length > 1 ? 2 : 0}
              stroke={CHART.surface}
              strokeWidth={2}
              cornerRadius={3}
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.key} fill={d.color} />
              ))}
            </Pie>
            <Tooltip content={(p) => <ChartTooltip active={p.active} payload={p.payload} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="font-display text-xl font-semibold text-fg">{fmtNumber(total)}</div>
            {centerLabel && <div className="text-[11px] text-muted">{centerLabel}</div>}
          </div>
        </div>
      </div>
      <ul className="min-w-[10rem] flex-1 space-y-2 text-[13px]">
        {data.map((d) => (
          <li key={d.key} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: d.color }} aria-hidden />
            <span className="min-w-0 flex-1 truncate capitalize text-fg">{d.name}</span>
            <span className="font-mono text-xs text-muted">{total ? `${Math.round((d.count / total) * 100)}%` : '—'}</span>
            <span className="w-10 text-right font-mono text-xs text-dim">{fmtNumber(d.count)}</span>
          </li>
        ))}
      </ul>
    </figure>
  )
}
