import { useId, type ReactNode } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fmtCompact } from '../../lib/format'
import { CHART, axisTick, colorAt, type SeriesDef } from './palette'
import { ChartLegend, ChartTooltip } from './ChartTooltip'

export interface AreaSeriesProps<T> {
  data: T[]
  xKey: string
  series: SeriesDef[]
  height?: number
  formatX?: (v: string) => string
  formatTooltipLabel?: (v: string) => ReactNode
  formatValue?: (v: number) => string
  /** Accessible summary of what the chart shows. */
  ariaLabel: string
}

/** Overlaid (not stacked) area lines over time, sharing one y-axis. */
export function AreaSeries<T>({ data, xKey, series, height = 260, formatX, formatTooltipLabel, formatValue, ariaLabel }: AreaSeriesProps<T>) {
  const uid = useId().replace(/:/g, '')
  const defs = series.map((s, i) => ({ ...s, color: s.color ?? colorAt(i) }))
  return (
    <figure role="img" aria-label={ariaLabel} className="m-0">
      {defs.length > 1 && <ChartLegend className="mb-3" items={defs.map((d) => ({ label: d.label, color: d.color }))} />}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -12 }}>
            <defs>
              {defs.map((d) => (
                <linearGradient key={d.key} id={`${uid}-${d.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={d.color} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={d.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis
              dataKey={xKey}
              tick={axisTick}
              tickFormatter={formatX}
              axisLine={{ stroke: CHART.axis }}
              tickLine={false}
              minTickGap={24}
              tickMargin={8}
            />
            <YAxis tick={axisTick} tickFormatter={(v: number) => fmtCompact(v)} axisLine={false} tickLine={false} allowDecimals={false} width={44} />
            <Tooltip
              cursor={{ stroke: CHART.cursor, strokeWidth: 1 }}
              content={(p) => (
                <ChartTooltip
                  active={p.active}
                  payload={p.payload}
                  label={p.label}
                  formatLabel={formatTooltipLabel}
                  formatValue={formatValue ? (v) => formatValue(v) : undefined}
                />
              )}
            />
            {defs.map((d) => (
              <Area
                key={d.key}
                type="monotone"
                dataKey={d.key}
                name={d.label}
                stroke={d.color}
                strokeWidth={2}
                fill={`url(#${uid}-${d.key})`}
                activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}
