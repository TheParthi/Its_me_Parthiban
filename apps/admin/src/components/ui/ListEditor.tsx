import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash } from 'lucide-react'
import { cn } from '../../lib/format'
import { Button } from './Button'

export interface ListEditorProps<T> {
  label?: ReactNode
  description?: ReactNode
  items: T[]
  onChange: (next: T[]) => void
  create: () => T
  render: (item: T, update: (next: T) => void, index: number) => ReactNode
  max?: number
  addLabel?: string
  error?: string | null
  empty?: ReactNode
  className?: string
}

/** Editable array with add / remove / move up / move down. */
export function ListEditor<T>({ label, description, items, onChange, create, render, max, addLabel = 'Add item', error, empty, className }: ListEditorProps<T>) {
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  const full = max !== undefined && items.length >= max
  return (
    <fieldset className={cn('min-w-0', className)}>
      {(label || description) && (
        <div className="mb-2 flex items-end justify-between gap-3">
          <div>
            {label && <legend className="text-[13px] font-medium text-[#d5d9e1]">{label}</legend>}
            {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
          </div>
          {max !== undefined && (
            <span className="font-mono text-[11px] text-dim">
              {items.length}/{max}
            </span>
          )}
        </div>
      )}
      <div className="space-y-2">
        {items.length === 0 && (empty ?? <p className="rounded-lg border border-dashed border-line px-3 py-3 text-xs text-muted">None yet.</p>)}
        {items.map((it, i) => (
          <div key={i} className="group flex items-start gap-2 rounded-lg border border-line bg-white/[0.015] p-2.5">
            <div className="min-w-0 flex-1">{render(it, (n) => onChange(items.map((x, j) => (j === i ? n : x))), i)}</div>
            <div className="flex shrink-0 flex-col gap-0.5">
              <Button size="icon-sm" variant="ghost" className="h-7 w-7" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move item ${i + 1} up`}>
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon-sm" variant="ghost" className="h-7 w-7" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={`Move item ${i + 1} down`}>
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                className="h-7 w-7 hover:text-rose-300"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                aria-label={`Remove item ${i + 1}`}
              >
                <Trash className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Button size="sm" variant="ghost" className="mt-2" onClick={() => onChange([...items, create()])} disabled={full} icon={<Plus className="h-3.5 w-3.5" />}>
        {addLabel}
      </Button>
      {error && (
        <p className="mt-1 text-xs text-rose-300" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  )
}
