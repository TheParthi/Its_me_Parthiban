import type { ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fmtCompact } from '../../lib/format'
import { CHART, axisTick, colorAt, type SeriesDef } from './palette'
import { ChartLegend, ChartTooltip } from './ChartTooltip'

export interface BarBreakdownProps<T> {
  data: T[]
  categoryKey: string
  series: SeriesDef[]
  /** `horizontal` = category labels on the left, bars grow right (ranked lists). */
  layout?: 'horizontal' | 'vertical'
  height?: number
  formatCategory?: (v: string) => string
  formatTooltipLabel?: (v: string) => ReactNode
  formatValue?: (v: number) => string
  /** Width reserved for category labels in horizontal layout. */
  labelWidth?: number
  ariaLabel: string
}

/** Bar chart for rankings (horizontal) or columns over categories/time (vertical). Grouped when several series. */
export function BarBreakdown<T>({
  data,
  categoryKey,
  series,
  layout = 'horizontal',
  height,
  formatCategory,
  formatTooltipLabel,
  formatValue,
  labelWidth = 112,
  ariaLabel,
}: BarBreakdownProps<T>) {
  const defs = series.map((s, i) => ({ ...s, color: s.color ?? colorAt(i) }))
  const horizontal = layout === 'horizontal'
  const h = height ?? (horizontal ? Math.max(120, data.length * (defs.length > 1 ? 44 : 32) + 24) : 240)
  const radius: [number, number, number, number] = horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]
  const truncate = (v: string) => {
    const s = formatCategory ? formatCategory(v) : v
    const max = Math.floor(labelWidth / 6.5)
    return s.length > max ? `${s.slice(0, max - 1)}…` : s
  }
  return (
    <figure role="img" aria-label={ariaLabel} className="m-0">
      {defs.length > 1 && <ChartLegend className="mb-3" items={defs.map((d) => ({ label: d.label, color: d.color }))} />}
      <div style={{ height: h }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout={horizontal ? 'vertical' : 'horizontal'}
            margin={horizontal ? { top: 0, right: 12, bottom: 0, left: 0 } : { top: 6, right: 8, bottom: 0, left: -12 }}
            barCategoryGap={horizontal ? 6 : '20%'}
            barGap={2}
          >
            <CartesianGrid stroke={CHART.grid} horizontal={!horizontal} vertical={horizontal} />
            {horizontal ? (
              <>
                <XAxis type="number" tick={axisTick} tickFormatter={(v: number) => fmtCompact(v)} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey={categoryKey}
                  tick={axisTick}
                  tickFormatter={truncate}
                  width={labelWidth}
                  axisLine={{ stroke: CHART.axis }}
                  tickLine={false}
                  interval={0}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey={categoryKey}
                  tick={axisTick}
                  tickFormatter={formatCategory}
                  axisLine={{ stroke: CHART.axis }}
                  tickLine={false}
                  minTickGap={16}
                  tickMargin={8}
                />
                <YAxis tick={axisTick} tickFormatter={(v: number) => fmtCompact(v)} axisLine={false} tickLine={false} allowDecimals={false} width={44} />
              </>
            )}
            <Tooltip
              cursor={{ fill: CHART.hoverFill }}
              content={(p) => (
                <ChartTooltip
                  active={p.active}
                  payload={p.payload}
                  label={p.label}
                  formatLabel={formatTooltipLabel ?? formatCategory}
                  formatValue={formatValue ? (v) => formatValue(v) : undefined}
                />
              )}
            />
            {defs.map((d) => (
              <Bar key={d.key} dataKey={d.key} name={d.label} fill={d.color} radius={radius} maxBarSize={horizontal ? 18 : 28} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}

/** Shorthand for the API's `{ key, count }[]` rankings. */
export function RankedBars({
  items,
  label = 'Count',
  color,
  formatKey,
  ariaLabel,
  labelWidth,
}: {
  items: { key: string; count: number }[]
  label?: string
  color?: string
  formatKey?: (k: string) => string
  ariaLabel: string
  labelWidth?: number
}) {
  return (
    <BarBreakdown
      data={items}
      categoryKey="key"
      series={[{ key: 'count', label, color }]}
      formatCategory={formatKey}
      ariaLabel={ariaLabel}
      labelWidth={labelWidth}
    />
  )
}
