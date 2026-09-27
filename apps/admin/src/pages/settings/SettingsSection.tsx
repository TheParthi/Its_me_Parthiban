import type { ReactNode } from 'react'
import { RotateCcw, Save } from 'lucide-react'
import type { UseQueryResult } from '@tanstack/react-query'
import { Button, Card, CardHeader, ErrorState, NumberInput, Skeleton, useToast } from '../../components/ui'
import { Gate } from '../../components/admin/shared'

/** The subset of `useSettingsSection` the card needs. */
export interface SectionLike<D> {
  query: UseQueryResult<unknown>
  draft: D | undefined
  dirty: boolean
  saving: boolean
  save: () => Promise<boolean>
  reset: () => void
}

/** Card with a Save / Discard footer for one settings section. */
export function SettingsCard<D>({
  s,
  title,
  description,
  icon,
  canWrite,
  writeReason,
  children,
}: {
  s: SectionLike<D>
  title: ReactNode
  description?: ReactNode
  icon?: ReactNode
  canWrite: boolean
  writeReason?: string
  children: (draft: D) => ReactNode
}) {
  const toast = useToast()
  const onSave = async () => {
    try {
      const ok = await s.save()
      if (ok) toast.success('Settings saved')
      else toast.error('Check the highlighted fields')
    } catch (e) {
      toast.fromError(e, 'Could not save settings')
    }
  }
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            {icon && <span className="text-muted">{icon}</span>}
            {title}
          </span>
        }
        description={description}
      />
      {s.query.error ? (
        <ErrorState error={s.query.error} onRetry={() => s.query.refetch()} />
      ) : !s.draft ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-2/3" />
        </div>
      ) : (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            if (canWrite && s.dirty) onSave()
          }}
        >
          <fieldset disabled={!canWrite || s.saving} className="space-y-4">
            {children(s.draft)}
          </fieldset>
          <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
            {s.dirty && <span className="mr-auto text-xs text-amber-300">Unsaved changes</span>}
            {!canWrite && <span className="mr-auto text-xs text-muted">{writeReason ?? 'Read-only'}</span>}
            <Button variant="ghost" size="sm" disabled={!s.dirty || s.saving} onClick={s.reset} icon={<RotateCcw className="h-3.5 w-3.5" />}>
              Discard
            </Button>
            <Gate reason={writeReason}>
              <Button type="submit" variant="primary" size="sm" loading={s.saving} disabled={!canWrite || !s.dirty} icon={<Save className="h-3.5 w-3.5" />}>
                Save
              </Button>
            </Gate>
          </div>
        </form>
      )}
    </Card>
  )
}

export function NumField({
  label,
  value,
  onChange,
  min,
  max,
  unit,
  error,
  hint,
}: {
  label: ReactNode
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  unit?: string
  error?: string
  hint?: ReactNode
}) {
  return (
    <NumberInput
      label={label}
      value={value}
      min={min}
      max={max}
      step={1}
      // An empty field is kept as null so validation reports it instead of saving 0.
      onChange={(v) => onChange(v as number)}
      error={error}
      hint={hint ?? `${min}–${max}${unit ? ` ${unit}` : ''}`}
    />
  )
}
