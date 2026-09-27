import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { TriangleAlert, X } from 'lucide-react'
import { cn } from '../../lib/format'
import { Button } from './Button'
import { Input } from './Field'

const FOCUSABLE = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

/** Keeps Tab inside `ref`, closes on Escape, restores focus on unmount. */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean, onEscape?: () => void) {
  const escRef = useRef(onEscape)
  escRef.current = onEscape
  useEffect(() => {
    if (!active) return
    const prev = document.activeElement as HTMLElement | null
    const node = ref.current
    const t = setTimeout(() => {
      if (!node) return
      const auto = node.querySelector<HTMLElement>('[data-autofocus]') ?? node.querySelector<HTMLElement>(FOCUSABLE)
      ;(auto ?? node).focus()
    }, 20)
    const onKey = (e: KeyboardEvent) => {
      if (!node) return
      // Only the top-most layer handles keys.
      const layers = document.querySelectorAll('[data-overlay-layer]')
      if (layers.length && layers[layers.length - 1] !== node) return
      if (e.key === 'Escape') {
        e.stopPropagation()
        escRef.current?.()
      } else if (e.key === 'Tab') {
        const f = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null)
        if (!f.length) return e.preventDefault()
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      prev?.focus?.()
    }
  }, [active, ref])
}

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Prevent closing by backdrop / Escape (e.g. while saving). */
  dismissable?: boolean
}

const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

export function Modal({ open, onClose, title, description, children, footer, size = 'md', dismissable = true }: ModalProps) {
  return createPortal(
    <AnimatePresence>{open && <ModalInner {...{ onClose, title, description, children, footer, size, dismissable }} />}</AnimatePresence>,
    document.body,
  )
}

function ModalInner({ onClose, title, description, children, footer, size = 'md', dismissable }: Omit<ModalProps, 'open'>) {
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()
  useFocusTrap(ref, true, dismissable ? onClose : undefined)
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={dismissable ? onClose : undefined}
      />
      <motion.div
        ref={ref}
        data-overlay-layer
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-t`}
        aria-describedby={description ? `${id}-d` : undefined}
        tabIndex={-1}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-line-2 bg-card shadow-2xl shadow-black/60 sm:rounded-2xl',
          widths[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 id={`${id}-t`} className="text-base font-semibold text-fg">
              {title}
            </h2>
            {description && (
              <p id={`${id}-d`} className="mt-1 text-[13px] text-muted">
                {description}
              </p>
            )}
          </div>
          {dismissable && (
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close dialog">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-black/10 px-5 py-3">{footer}</div>}
      </motion.div>
    </div>
  )
}

export interface DrawerProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  width?: 'md' | 'lg' | 'xl'
  side?: 'right' | 'left'
}

const drawerWidths = { md: 'max-w-md', lg: 'max-w-xl', xl: 'max-w-3xl' }

export function Drawer({ open, onClose, title, description, children, footer, width = 'lg', side = 'right' }: DrawerProps) {
  return createPortal(
    <AnimatePresence>
      {open && <DrawerInner {...{ onClose, title, description, children, footer, width, side }} />}
    </AnimatePresence>,
    document.body,
  )
}

function DrawerInner({ onClose, title, description, children, footer, width = 'lg', side = 'right' }: Omit<DrawerProps, 'open'>) {
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()
  useFocusTrap(ref, true, onClose)
  const x = side === 'right' ? '100%' : '-100%'
  return (
    <div className="fixed inset-0 z-[70]">
      <motion.div className="absolute inset-0 bg-black/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.aside
        ref={ref}
        data-overlay-layer
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-t`}
        tabIndex={-1}
        initial={{ x }}
        animate={{ x: 0 }}
        exit={{ x }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          'absolute top-0 flex h-full w-full flex-col border-line-2 bg-sidebar shadow-2xl shadow-black/60',
          side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
          drawerWidths[width],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 id={`${id}-t`} className="truncate text-base font-semibold text-fg">
              {title}
            </h2>
            {description && <div className="mt-1 text-[13px] text-muted">{description}</div>}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close panel">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </motion.aside>
    </div>
  )
}

export interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<unknown>
  title: ReactNode
  description?: ReactNode
  confirmLabel?: string
  /** When set, the user must type this text exactly to enable the button. */
  typeToConfirm?: string
  tone?: 'danger' | 'primary'
  loading?: boolean
  children?: ReactNode
}

/** Confirmation for destructive or state-replacing actions. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  typeToConfirm,
  tone = 'danger',
  loading,
  children,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (open) setTyped('')
  }, [open])
  const ok = !typeToConfirm || typed === typeToConfirm
  const run = async () => {
    if (!ok) return
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      dismissable={!busy && !loading}
      title={
        <span className="flex items-center gap-2">
          {tone === 'danger' && <TriangleAlert className="h-4 w-4 text-rose-400" aria-hidden />}
          {title}
        </span>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy || loading}>
            Cancel
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={run} disabled={!ok} loading={busy || loading} data-autofocus={!typeToConfirm || undefined}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          run()
        }}
        className="space-y-4"
      >
        {description && <div className="text-sm text-muted">{description}</div>}
        {children}
        {typeToConfirm && (
          <Input
            data-autofocus
            label={
              <>
                Type <span className="font-mono text-fg">{typeToConfirm}</span> to confirm
              </>
            }
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        )}
      </form>
    </Modal>
  )
}
