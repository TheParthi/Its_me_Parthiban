import { useState, type ReactNode } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { MediaPicker, MediaThumb } from '../media/MediaPicker'
import { Button, Field } from '../ui'

/** Single media reference (id) chosen from the library, with preview and clear. */
export function MediaField({
  label,
  hint,
  error,
  value,
  onChange,
  category,
  disabled,
}: {
  label: ReactNode
  hint?: ReactNode
  error?: string | null
  value: string | null | undefined
  onChange: (id: string | null) => void
  category?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <Field label={label} hint={hint} error={error}>
      {({ id, describedBy }) => (
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-line bg-white/[0.03]">
            {value ? <MediaThumb id={value} className="h-full w-full" /> : <div className="grid h-full w-full place-items-center text-dim"><ImagePlus className="h-5 w-5" aria-hidden /></div>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button id={id} aria-describedby={describedBy} size="sm" onClick={() => setOpen(true)} disabled={disabled}>
              {value ? 'Replace' : 'Choose from library'}
            </Button>
            {value && (
              <Button size="sm" variant="ghost" onClick={() => onChange(null)} disabled={disabled} icon={<X className="h-3.5 w-3.5" />}>
                Remove
              </Button>
            )}
          </div>
          <MediaPicker
            open={open}
            onClose={() => setOpen(false)}
            category={category}
            initialSelected={value ? [value] : []}
            onPick={(a) => {
              if (a[0]) onChange(a[0].id)
              setOpen(false)
            }}
          />
        </div>
      )}
    </Field>
  )
}
