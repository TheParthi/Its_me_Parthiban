import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { SOURCE_CATEGORIES, type SourceCategory } from '@pg/shared'
import type { QueryValue } from '../../lib/api'
import { Button, Input, Select } from '../../components/ui'
import { SOURCE_LABELS } from './format'

export interface Filters {
  path: string
  source: SourceCategory | ''
  campaign: string
}

const EMPTY: Filters = { path: '', source: '', campaign: '' }

function useDebounced<T>(value: T, ms = 400) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

/** Filter state + the extra query params for rangeQuerySchema (path/source/campaign). */
export function useFilters() {
  const [filters, setFilters] = useState<Filters>(EMPTY)
  const path = useDebounced(filters.path.trim())
  const campaign = useDebounced(filters.campaign.trim())
  const params = useMemo<Record<string, QueryValue>>(
    () => ({
      path: path ? (path.startsWith('/') ? path : `/${path}`).slice(0, 200) : undefined,
      source: filters.source || undefined,
      campaign: campaign ? campaign.slice(0, 120) : undefined,
    }),
    [path, campaign, filters.source],
  )
  const active = !!(filters.path.trim() || filters.source || filters.campaign.trim())
  return { filters, setFilters, params, active, reset: () => setFilters(EMPTY) }
}

export function VisitorFilters({ filters, onChange, active, onReset }: { filters: Filters; onChange: (f: Filters) => void; active: boolean; onReset: () => void }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_12rem_1fr_auto] lg:items-start">
      <Input
        label="Page path"
        placeholder="/projects/nexaride"
        value={filters.path}
        maxLength={200}
        onChange={(e) => onChange({ ...filters, path: e.target.value })}
        hint="Exact path, e.g. / or /projects"
      />
      <Select
        label="Source"
        value={filters.source}
        placeholder="All sources"
        hint="How the visit arrived"
        options={SOURCE_CATEGORIES.map((s) => ({ value: s, label: SOURCE_LABELS[s] ?? s }))}
        onChange={(v) => onChange({ ...filters, source: v })}
      />
      <Input
        label="Campaign"
        placeholder="utm_campaign"
        value={filters.campaign}
        maxLength={120}
        onChange={(e) => onChange({ ...filters, campaign: e.target.value })}
        hint="Exact UTM campaign name"
      />
      <Button variant="ghost" size="md" onClick={onReset} disabled={!active} icon={<X className="h-4 w-4" />} className="lg:mt-[1.625rem]">
        Clear filters
      </Button>
    </div>
  )
}
