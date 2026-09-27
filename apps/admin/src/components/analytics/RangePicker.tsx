import { useMemo, useState } from 'react'
import { Calendar } from 'lucide-react'
import type { RangeQuery } from '@pg/shared'
import type { QueryValue } from '../../lib/api'
import { Segmented, controlClass } from '../ui'

export type Preset = RangeQuery['preset']

export interface RangeState {
  preset: Preset
  /** YYYY-MM-DD, only for custom. */
  from: string
  to: string
}

const today = () => new Date().toISOString().slice(0, 10)
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10)

export function useRange(initial: Preset = '7d') {
  const [range, setRange] = useState<RangeState>({ preset: initial, from: daysAgo(29), to: today() })
  /** Query params for `rangeQuerySchema` (ISO datetimes with offset). */
  const query = useMemo<Record<string, QueryValue>>(() => {
    if (range.preset !== 'custom') return { preset: range.preset }
    const from = new Date(`${range.from}T00:00:00`)
    const to = new Date(`${range.to}T23:59:59.999`)
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return { preset: '7d' }
    return { preset: 'custom', from: from.toISOString(), to: to.toISOString() }
  }, [range])
  return { range, setRange, query }
}

const PRESETS: { value: Preset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'custom', label: 'Custom' },
]

export function RangePicker({ range, onChange }: { range: RangeState; onChange: (r: RangeState) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Segmented aria-label="Date range" value={range.preset} onChange={(preset) => onChange({ ...range, preset })} options={PRESETS} />
      {range.preset === 'custom' && (
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-dim" aria-hidden />
          <input
            type="date"
            aria-label="From date"
            value={range.from}
            max={range.to}
            onChange={(e) => onChange({ ...range, from: e.target.value })}
            className={`${controlClass} h-8 w-[9.5rem] [color-scheme:dark]`}
          />
          <span className="text-dim">–</span>
          <input
            type="date"
            aria-label="To date"
            value={range.to}
            min={range.from}
            max={today()}
            onChange={(e) => onChange({ ...range, to: e.target.value })}
            className={`${controlClass} h-8 w-[9.5rem] [color-scheme:dark]`}
          />
        </div>
      )}
    </div>
  )
}
