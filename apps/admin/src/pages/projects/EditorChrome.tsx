import { useEffect } from 'react'
import { useBlocker } from 'react-router'
import { CircleAlert, CircleCheck, CloudOff, LoaderCircle } from 'lucide-react'
import { ConfirmDialog } from '../../components/ui'
import { cn, fmtRelative } from '../../lib/format'
import type { SaveState } from './useProjectDraft'

/** "Saving… / Saved / Error" autosave indicator. */
export function SaveIndicator({ state, dirty, savedAt, className }: { state: SaveState; dirty: boolean; savedAt: number | null; className?: string }) {
  const base = cn('inline-flex items-center gap-1.5 text-[13px]', className)
  if (state === 'saving')
    return (
      <span className={cn(base, 'text-muted')} role="status">
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden /> Saving…
      </span>
    )
  if (state === 'error')
    return (
      <span className={cn(base, 'text-rose-300')} role="status">
        <CloudOff className="h-3.5 w-3.5" aria-hidden /> Error — not saved
      </span>
    )
  if (state === 'invalid')
    return (
      <span className={cn(base, 'text-amber-300')} role="status">
        <CircleAlert className="h-3.5 w-3.5" aria-hidden /> Fix errors to save
      </span>
    )
  if (dirty)
    return (
      <span className={cn(base, 'text-muted')} role="status">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden /> Unsaved edits
      </span>
    )
  if (state === 'saved')
    return (
      <span className={cn(base, 'text-emerald-300')} role="status" title={savedAt ? new Date(savedAt).toLocaleString() : undefined}>
        <CircleCheck className="h-3.5 w-3.5" aria-hidden /> Saved {savedAt ? fmtRelative(new Date(savedAt).toISOString()) : ''}
      </span>
    )
  return (
    <span className={cn(base, 'text-dim')} role="status">
      <CircleCheck className="h-3.5 w-3.5" aria-hidden /> All changes saved
    </span>
  )
}

/** Warns before leaving with unsaved edits: in-app navigation and tab close. */
export function LeaveGuard({ when }: { when: boolean }) {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => when && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    if (!when) return
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [when])
  return (
    <ConfirmDialog
      open={blocker.state === 'blocked'}
      onClose={() => blocker.reset?.()}
      onConfirm={() => blocker.proceed?.()}
      title="Leave with unsaved changes?"
      description="Some edits have not been saved (they may be invalid or still saving). If you leave now they may be lost."
      confirmLabel="Leave anyway"
    />
  )
}
