import { useId, useState, type KeyboardEvent, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/format'
import { Field } from './Field'
import { SortableList } from './Sortable'

export interface TagInputProps {
  label?: ReactNode
  hint?: ReactNode
  error?: string | null
  value: string[]
  onChange: (v: string[]) => void
  placeholder?: string
  max?: number
  maxLength?: number
  /** Allow drag-reordering the chips. */
  sortable?: boolean
  suggestions?: string[]
  className?: string
}

/** Chips input: Enter or comma adds, Backspace on empty removes the last. */
export function TagInput({ label, hint, error, value, onChange, placeholder = 'Type and press Enter', max, maxLength = 60, sortable, suggestions, className }: TagInputProps) {
  const [draft, setDraft] = useState('')
  const listId = useId()
  const full = max !== undefined && value.length >= max

  const add = (raw: string) => {
    const parts = raw
      .split(',')
      .map((s) => s.trim().slice(0, maxLength))
      .filter(Boolean)
    if (!parts.length) return
    const next = [...value]
    for (const p of parts) {
      if (max !== undefined && next.length >= max) break
      if (!next.some((v) => v.toLowerCase() === p.toLowerCase())) next.push(p)
    }
    onChange(next)
    setDraft('')
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add(draft)
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  const chip = (t: string, i: number, handle?: ReactNode) => (
    <span className="inline-flex h-7 items-center gap-1 rounded-md border border-line-2 bg-white/[0.05] pl-1.5 pr-1 text-xs text-fg">
      {handle}
      <span className={cn(!handle && 'pl-1')}>{t}</span>
      <button
        type="button"
        onClick={() => onChange(value.filter((_, j) => j !== i))}
        className="grid h-5 w-5 place-items-center rounded text-muted hover:bg-white/10 hover:text-fg"
        aria-label={`Remove ${t}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )

  return (
    <Field label={label} hint={hint ?? (max ? `${value.length}/${max}` : undefined)} error={error} className={className}>
      {({ id, describedBy, invalid }) => (
        <div
          className={cn(
            'flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-line bg-[#0f121a] px-1.5 py-1 focus-within:border-accent/70 focus-within:ring-2 focus-within:ring-accent/25',
            invalid && 'border-rose-500/60',
          )}
        >
          {sortable && value.length > 1 ? (
            <SortableList
              layout="horizontal"
              items={value.map((v, i) => ({ v, i }))}
              getId={(x) => `${x.v}`}
              onReorder={(next) => onChange(next.map((x) => x.v))}
              className="flex flex-wrap gap-1.5"
              renderItem={(x, h) =>
                chip(
                  x.v,
                  x.i,
                  <span
                    ref={h.setActivatorNodeRef}
                    {...h.attributes}
                    {...h.listeners}
                    className="cursor-grab touch-none px-0.5 text-dim hover:text-fg"
                    aria-label={`Reorder ${x.v}`}
                  >
                    ⋮⋮
                  </span>,
                )
              }
            />
          ) : (
            value.map((t, i) => <span key={`${t}-${i}`}>{chip(t, i)}</span>)
          )}
          <input
            id={id}
            aria-describedby={describedBy}
            list={suggestions?.length ? listId : undefined}
            value={draft}
            disabled={full}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            onBlur={() => draft && add(draft)}
            placeholder={full ? 'Limit reached' : placeholder}
            className="field-control h-7 min-w-[8rem] flex-1 bg-transparent px-1.5 text-sm text-fg placeholder:text-dim focus:outline-none"
          />
          {suggestions?.length ? (
            <datalist id={listId}>
              {suggestions.filter((s) => !value.includes(s)).map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          ) : null}
        </div>
      )}
    </Field>
  )
}
