import { useId } from 'react'
import { ChevronDown, Lock } from 'lucide-react'
import type { SectionConfig } from '@pg/shared'
import type { FieldErrors } from '../../lib/forms'
import { cn } from '../../lib/format'
import { Badge, DragHandle, InfoTip, Input, Segmented, Switch, Textarea, type SortableHandleProps } from '../../components/ui'
import { BACKGROUNDS, SECTION_META, SPACINGS } from './sectionMeta'

export interface SectionCardProps {
  section: SectionConfig
  index: number
  handle: SortableHandleProps
  dragging: boolean
  expanded: boolean
  onToggleExpand: () => void
  onChange: (key: keyof SectionConfig, value: unknown) => void
  errors: FieldErrors
  disabled?: boolean
}

export function SectionCard({ section, index, handle, dragging, expanded, onToggleExpand, onChange, errors, disabled }: SectionCardProps) {
  const meta = SECTION_META[section.type]
  const isHero = section.type === 'hero'
  const panelId = useId()
  const e = (k: string) => errors[`sections.${index}.${k}`]
  const hasError = Object.keys(errors).some((k) => k.startsWith(`sections.${index}.`))

  return (
    <div
      className={cn(
        'rounded-xl border bg-card transition-shadow',
        dragging ? 'border-accent/60 shadow-2xl shadow-black/60' : hasError ? 'border-rose-400/40' : 'border-line',
        !section.enabled && 'opacity-70',
      )}
    >
      <div className="flex items-center gap-2 px-2.5 py-2.5 sm:px-3">
        <DragHandle handle={handle} label={`Drag to reorder ${meta.label}`} />
        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-1 text-left focus-visible:outline-2 focus-visible:outline-accent"
        >
          <span className="font-mono text-[10.5px] text-dim">{String(index + 1).padStart(2, '0')}</span>
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="truncate text-[13.5px] font-medium text-fg">{meta.label}</span>
              {!section.enabled && <Badge tone="gray">Hidden</Badge>}
              {hasError && <Badge tone="rose">Fix errors</Badge>}
            </span>
            <span className="block truncate text-xs text-muted">{section.heading || meta.description}</span>
          </span>
          <ChevronDown className={cn('ml-auto h-4 w-4 shrink-0 text-muted transition-transform', expanded && 'rotate-180')} aria-hidden />
        </button>
        <div className="flex shrink-0 items-center gap-1.5">
          {isHero && (
            <InfoTip label="Why the hero cannot be hidden">
              <span className="inline-flex items-center gap-1">
                <Lock className="h-3 w-3" /> The hero introduces the site and holds the main heading, so it always stays visible. You can still reorder and restyle it.
              </span>
            </InfoTip>
          )}
          <Switch
            size="sm"
            checked={section.enabled}
            onChange={(v) => onChange('enabled', v)}
            disabled={disabled || isHero}
            aria-label={`${section.enabled ? 'Hide' : 'Show'} ${meta.label} section`}
          />
        </div>
      </div>
      {expanded && (
        <div id={panelId} className="space-y-4 border-t border-line px-3 py-4 sm:px-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <Input label="Eyebrow" value={section.eyebrow ?? ''} maxLength={40} showCount disabled={disabled} error={e('eyebrow')} onChange={(ev) => onChange('eyebrow', ev.target.value)} placeholder="e.g. Selected work" />
            <Input label="Heading" value={section.heading ?? ''} maxLength={120} showCount disabled={disabled} error={e('heading')} onChange={(ev) => onChange('heading', ev.target.value)} placeholder="Leave empty for the default" />
          </div>
          <Textarea label="Description" rows={2} value={section.description ?? ''} maxLength={400} showCount disabled={disabled} error={e('description')} onChange={(ev) => onChange('description', ev.target.value)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <fieldset>
              <legend className="mb-1.5 text-[13px] font-medium text-[#d5d9e1]">Background</legend>
              <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Background">
                {BACKGROUNDS.map((b) => {
                  const active = section.background === b.value
                  return (
                    <button
                      key={b.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      disabled={disabled}
                      onClick={() => onChange('background', b.value)}
                      className={cn('group flex flex-col items-center gap-1 rounded-lg p-1 focus-visible:outline-2 focus-visible:outline-accent', active ? 'bg-accent/10' : 'hover:bg-white/[0.04]')}
                    >
                      <span className={cn('h-9 w-full rounded-md border', active ? 'border-accent ring-1 ring-accent' : 'border-line-2')} style={{ background: b.swatch }} aria-hidden />
                      <span className={cn('text-[11px]', active ? 'text-fg' : 'text-muted')}>{b.label}</span>
                    </button>
                  )
                })}
              </div>
            </fieldset>
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-[#d5d9e1]">Spacing</p>
              <Segmented aria-label="Spacing" size="sm" value={section.spacing} onChange={(v) => !disabled && onChange('spacing', v)} options={SPACINGS} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
