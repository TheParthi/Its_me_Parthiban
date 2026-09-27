import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/format'
import { Button } from './Button'

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

export interface TabItem<V extends string> {
  value: V
  label: ReactNode
  count?: number
  icon?: ReactNode
  /** Shows a dot (e.g. errors inside the tab). */
  alert?: boolean
}

export function Tabs<V extends string>({
  value,
  onChange,
  items,
  className,
  'aria-label': ariaLabel,
}: {
  value: V
  onChange: (v: V) => void
  items: readonly TabItem<V>[]
  className?: string
  'aria-label'?: string
}) {
  const id = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: KeyboardEvent, i: number) => {
    const n = items.length
    let j = -1
    if (e.key === 'ArrowRight') j = (i + 1) % n
    else if (e.key === 'ArrowLeft') j = (i - 1 + n) % n
    else if (e.key === 'Home') j = 0
    else if (e.key === 'End') j = n - 1
    if (j >= 0) {
      e.preventDefault()
      refs.current[j]?.focus()
      onChange(items[j].value)
    }
  }
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn('scroll-thin -mb-px flex gap-1 overflow-x-auto border-b border-line', className)}>
      {items.map((t, i) => {
        const active = t.value === value
        return (
          <button
            key={t.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            role="tab"
            id={`${id}-${t.value}`}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onKeyDown={(e) => onKey(e, i)}
            onClick={() => onChange(t.value)}
            className={cn(
              'relative inline-flex h-10 shrink-0 items-center gap-2 px-3 text-[13px] font-medium transition-colors',
              active ? 'text-fg' : 'text-muted hover:text-fg',
            )}
          >
            {t.icon}
            {t.label}
            {t.count !== undefined && (
              <span className={cn('rounded px-1.5 font-mono text-[10.5px]', active ? 'bg-accent/20 text-violet-200' : 'bg-white/5 text-muted')}>{t.count}</span>
            )}
            {t.alert && <span className="h-1.5 w-1.5 rounded-full bg-rose-400" aria-label="has errors" />}
            {active && <motion.span layoutId={`${id}-ind`} className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />}
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dropdown menu
// ---------------------------------------------------------------------------

export interface MenuItem {
  label: ReactNode
  icon?: ReactNode
  onSelect?: () => void
  href?: string
  danger?: boolean
  disabled?: boolean
  hint?: ReactNode
  separatorBefore?: boolean
}

/**
 * Accessible dropdown: trigger toggles, arrow keys move, Enter selects,
 * Escape closes and returns focus to the trigger.
 */
export function Menu({
  trigger,
  items,
  align = 'right',
  width = 'w-56',
  label,
  header,
}: {
  trigger: (props: { onClick: () => void; 'aria-expanded': boolean; 'aria-haspopup': 'menu'; ref: (el: HTMLButtonElement | null) => void; id: string }) => ReactNode
  items: MenuItem[]
  align?: 'left' | 'right'
  width?: string
  label?: string
  header?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    setTimeout(() => menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus(), 10)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const onKey = (e: KeyboardEvent) => {
    const els = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? [])
    const i = els.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      els[(i + 1) % els.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      els[(i - 1 + els.length) % els.length]?.focus()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
      triggerRef.current?.focus()
    } else if (e.key === 'Tab') setOpen(false)
  }

  return (
    <div className="relative">
      {trigger({
        onClick: () => setOpen((o) => !o),
        'aria-expanded': open,
        'aria-haspopup': 'menu',
        ref: (el) => {
          triggerRef.current = el
        },
        id: `${id}-trigger`,
      })}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            role="menu"
            aria-label={label}
            aria-labelledby={label ? undefined : `${id}-trigger`}
            onKeyDown={onKey}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className={cn(
              'absolute top-full z-[60] mt-1.5 overflow-hidden rounded-xl border border-line-2 bg-[#171b26] p-1 shadow-2xl shadow-black/50',
              align === 'right' ? 'right-0' : 'left-0',
              width,
            )}
          >
            {header}
            {items.map((it, i) => (
              <div key={i}>
                {it.separatorBefore && <div className="my-1 h-px bg-line" role="separator" />}
                <button
                  role="menuitem"
                  type="button"
                  disabled={it.disabled}
                  onClick={() => {
                    setOpen(false)
                    if (it.href) window.open(it.href, '_blank', 'noopener,noreferrer')
                    it.onSelect?.()
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] outline-none transition-colors disabled:opacity-40',
                    it.danger ? 'text-rose-300 hover:bg-rose-500/10 focus:bg-rose-500/10' : 'text-[#d5d9e1] hover:bg-white/[0.06] focus:bg-white/[0.06]',
                  )}
                >
                  {it.icon && <span className="shrink-0 opacity-80">{it.icon}</span>}
                  <span className="flex-1">{it.label}</span>
                  {it.hint && <span className="font-mono text-[10.5px] text-dim">{it.hint}</span>}
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export function Pagination({ page, pageSize, total, onPage, className }: { page: number; pageSize: number; total: number; onPage: (p: number) => void; className?: string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total <= pageSize && page === 1) return null
  const from = total ? (page - 1) * pageSize + 1 : 0
  const to = Math.min(total, page * pageSize)
  return (
    <nav aria-label="Pagination" className={cn('flex items-center justify-between gap-3 pt-3', className)}>
      <p className="mono-meta">
        {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-1">
        <Button size="icon-sm" variant="ghost" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-2 font-mono text-xs text-muted" aria-current="page">
          {page} / {pages}
        </span>
        <Button size="icon-sm" variant="ghost" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  )
}
