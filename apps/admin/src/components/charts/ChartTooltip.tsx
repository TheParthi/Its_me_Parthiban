import type { ReactNode } from 'react'
import { fmtNumber } from '../../lib/format'

interface Item {
  name?: unknown
  value?: unknown
  color?: string
  dataKey?: unknown
  payload?: unknown
}

export interface ChartTooltipProps {
  active?: boolean
  payload?: readonly Item[]
  label?: unknown
  formatLabel?: (label: string) => ReactNode
  formatValue?: (v: number, name: string) => ReactNode
}

/** Dark-theme tooltip for recharts: pass as `content={<ChartTooltip … />}`. */
export function ChartTooltip({ active, payload, label, formatLabel, formatValue = (v) => fmtNumber(v) }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const l = label == null ? '' : String(label)
  return (
    <div className="min-w-[9rem] rounded-lg border border-line-2 bg-[#1b2030]/95 px-3 py-2 text-xs shadow-xl shadow-black/40 backdrop-blur">
      {l && <p className="mb-1.5 font-medium text-fg">{formatLabel ? formatLabel(l) : l}</p>}
      <ul className="space-y-1">
        {payload.map((p, i) => {
          const name = String(p.name ?? p.dataKey ?? '')
          const v = typeof p.value === 'number' ? p.value : Number(p.value)
          return (
            <li key={`${name}-${i}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-muted">
                <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} aria-hidden />
                {name}
              </span>
              <span className="font-mono font-medium text-fg">{Number.isFinite(v) ? formatValue(v, name) : '—'}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** HTML legend (keeps text in text colours; the swatch carries identity). */
export function ChartLegend({ items, className }: { items: { label: string; color: string }[]; className?: string }) {
  return (
    <ul className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted ${className ?? ''}`}>
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: it.color }} aria-hidden />
          {it.label}
        </li>
      ))}
    </ul>
  )
}
