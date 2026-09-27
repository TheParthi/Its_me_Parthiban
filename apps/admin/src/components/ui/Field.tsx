import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { ChevronDown, CircleAlert, Eye, EyeOff } from 'lucide-react'
import { cn } from '../../lib/format'

export const controlClass =
  'field-control w-full rounded-lg border border-line bg-[#0f121a] px-3 text-sm text-fg placeholder:text-dim transition-colors hover:border-line-2 focus:border-accent/70 focus:ring-2 focus:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-rose-500/60 aria-[invalid=true]:focus:ring-rose-500/20'

export interface FieldProps {
  label?: ReactNode
  hint?: ReactNode
  error?: string | null
  required?: boolean
  /** Show `current/max` characters. */
  count?: { value: number; max: number }
  className?: string
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode
  labelAction?: ReactNode
}

/** Label + control + hint + inline error, wired with aria attributes. */
export function Field({ label, hint, error, required, count, className, children, labelAction }: FieldProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errId = error ? `${id}-err` : undefined
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined
  const over = count && count.value > count.max
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      {(label || count || labelAction) && (
        <div className="flex items-baseline justify-between gap-3">
          {label && (
            <label htmlFor={id} className="text-[13px] font-medium text-[#d5d9e1]">
              {label}
              {required && <span className="ml-0.5 text-rose-400" aria-hidden>*</span>}
            </label>
          )}
          <div className="flex items-center gap-2">
            {labelAction}
            {count && (
              <span className={cn('font-mono text-[11px]', over ? 'text-rose-400' : count.value > count.max * 0.9 ? 'text-amber-300' : 'text-dim')}>
                {count.value}/{count.max}
              </span>
            )}
          </div>
        </div>
      )}
      {children({ id, describedBy, invalid: !!error })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="flex items-start gap-1.5 text-xs text-rose-300" role="alert">
          <CircleAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  )
}

type Common = { label?: ReactNode; hint?: ReactNode; error?: string | null; containerClassName?: string; showCount?: boolean; labelAction?: ReactNode }

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>, Common {
  leading?: ReactNode
  trailing?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, containerClassName, showCount, leading, trailing, className, required, maxLength, value, labelAction, ...rest },
  ref,
) {
  const count = showCount && maxLength ? { value: String(value ?? '').length, max: maxLength } : undefined
  return (
    <Field label={label} hint={hint} error={error} required={required} count={count} className={containerClassName} labelAction={labelAction}>
      {({ id, describedBy, invalid }) => (
        <div className="relative flex items-center">
          {leading && <span className="pointer-events-none absolute left-3 text-muted">{leading}</span>}
          <input
            ref={ref}
            id={rest.id ?? id}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            required={required}
            value={value}
            className={cn(controlClass, 'h-9', leading ? 'pl-9' : '', trailing ? 'pr-10' : '', className)}
            {...rest}
          />
          {trailing && <span className="absolute right-2 flex items-center">{trailing}</span>}
        </div>
      )}
    </Field>
  )
})

export function PasswordInput(props: Omit<InputProps, 'type' | 'trailing'>) {
  const [show, setShow] = useState(false)
  return (
    <Input
      {...props}
      type={show ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-white/5 hover:text-fg"
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      }
    />
  )
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, Common {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, containerClassName, showCount = true, className, required, maxLength, value, rows = 4, labelAction, ...rest },
  ref,
) {
  const count = showCount && maxLength ? { value: String(value ?? '').length, max: maxLength } : undefined
  return (
    <Field label={label} hint={hint} error={error} required={required} count={count} className={containerClassName} labelAction={labelAction}>
      {({ id, describedBy, invalid }) => (
        <textarea
          ref={ref}
          id={rest.id ?? id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          required={required}
          value={value}
          rows={rows}
          className={cn(controlClass, 'resize-y py-2 leading-relaxed', className)}
          {...rest}
        />
      )}
    </Field>
  )
})

export interface SelectOption<V extends string = string> {
  value: V
  label: string
  disabled?: boolean
}

export interface SelectProps<V extends string = string> extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'>, Common {
  value: V | ''
  options: readonly SelectOption<V>[]
  onChange: (v: V) => void
  placeholder?: string
}

export function Select<V extends string = string>({
  label,
  hint,
  error,
  containerClassName,
  options,
  value,
  onChange,
  placeholder,
  className,
  required,
  labelAction,
  ...rest
}: SelectProps<V>) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={containerClassName} labelAction={labelAction}>
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          <select
            id={rest.id ?? id}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            value={value}
            required={required}
            onChange={(e) => onChange(e.target.value as V)}
            className={cn(controlClass, 'h-9 appearance-none pr-9', className)}
            {...rest}
          >
            {placeholder !== undefined && (
              <option value="" disabled={required}>
                {placeholder}
              </option>
            )}
            {options.map((o) => (
              <option key={o.value} value={o.value} disabled={o.disabled}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        </div>
      )}
    </Field>
  )
}

export const opts = <V extends string>(values: readonly V[], labels?: Partial<Record<V, string>>): SelectOption<V>[] =>
  values.map((v) => ({ value: v, label: labels?.[v] ?? v }))

export interface SwitchProps {
  checked: boolean
  onChange: (v: boolean) => void
  label?: ReactNode
  description?: ReactNode
  disabled?: boolean
  className?: string
  size?: 'sm' | 'md'
  'aria-label'?: string
}

export function Switch({ checked, onChange, label, description, disabled, className, size = 'md', ...aria }: SwitchProps) {
  const id = useId()
  const track = size === 'sm' ? 'h-4 w-7' : 'h-5 w-9'
  const knob = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
  const shift = size === 'sm' ? 'translate-x-3' : 'translate-x-4'
  const btn = (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={aria['aria-label']}
      aria-describedby={description ? `${id}-d` : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex shrink-0 items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        track,
        checked ? 'border-accent/60 bg-accent' : 'border-line-2 bg-white/10',
      )}
    >
      <span className={cn('ml-0.5 rounded-full bg-white shadow transition-transform duration-200', knob, checked ? shift : 'translate-x-0')} />
    </button>
  )
  if (!label) return <span className={className}>{btn}</span>
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <label htmlFor={id} className="cursor-pointer text-[13px] font-medium text-[#d5d9e1]">
          {label}
        </label>
        {description && (
          <p id={`${id}-d`} className="mt-0.5 text-xs text-muted">
            {description}
          </p>
        )}
      </div>
      {btn}
    </div>
  )
}

export function Checkbox({
  checked,
  onChange,
  label,
  indeterminate,
  className,
  'aria-label': ariaLabel,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: ReactNode
  indeterminate?: boolean
  className?: string
  'aria-label'?: string
  disabled?: boolean
}) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2 text-sm', disabled && 'cursor-not-allowed opacity-50', className)}>
      <input
        type="checkbox"
        className="h-4 w-4 cursor-pointer rounded border-line-2 bg-transparent accent-[#8B5CF6]"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        ref={(el) => {
          if (el) el.indeterminate = !!indeterminate
        }}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  )
}

export interface SegmentedProps<V extends string> {
  value: V
  onChange: (v: V) => void
  options: readonly { value: V; label: ReactNode; icon?: ReactNode; title?: string }[]
  size?: 'sm' | 'md'
  className?: string
  'aria-label'?: string
}

export function Segmented<V extends string>({ value, onChange, options, size = 'md', className, ...aria }: SegmentedProps<V>) {
  return (
    <div role="radiogroup" aria-label={aria['aria-label']} className={cn('inline-flex rounded-lg border border-line bg-white/[0.03] p-0.5', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md font-medium transition-colors',
            size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[13px]',
            value === o.value ? 'bg-white/10 text-fg shadow-sm' : 'text-muted hover:text-fg',
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ColorInput({
  label,
  value,
  onChange,
  error,
  hint,
  className,
}: {
  label?: ReactNode
  value: string
  onChange: (v: string) => void
  error?: string | null
  hint?: ReactNode
  className?: string
}) {
  const [text, setText] = useState(value)
  const [prev, setPrev] = useState(value)
  if (prev !== value) {
    setPrev(value)
    setText(value)
  }
  const valid = /^#[0-9a-fA-F]{6}$/.test(text)
  return (
    <Field label={label} error={error ?? (!valid ? 'Use a 6-digit hex colour like #8B5CF6' : null)} hint={hint} className={className}>
      {({ id, describedBy, invalid }) => (
        <div className="flex items-center gap-2">
          <label className="relative h-9 w-11 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-line-2" style={{ background: valid ? text : value }}>
            <span className="sr-only">Pick colour</span>
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'}
              onChange={(e) => onChange(e.target.value.toUpperCase())}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
          <input
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            value={text}
            spellCheck={false}
            maxLength={7}
            onChange={(e) => {
              let v = e.target.value.trim()
              if (v && !v.startsWith('#')) v = `#${v}`
              setText(v)
              if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v.toUpperCase())
            }}
            className={cn(controlClass, 'h-9 font-mono uppercase')}
          />
        </div>
      )}
    </Field>
  )
}

export function NumberInput({
  value,
  onChange,
  ...rest
}: Omit<InputProps, 'value' | 'onChange' | 'type'> & { value: number | null | undefined; onChange: (v: number | null) => void }) {
  return (
    <Input
      {...rest}
      type="number"
      inputMode="numeric"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
    />
  )
}
