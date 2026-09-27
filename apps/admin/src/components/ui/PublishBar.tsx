import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { CircleCheck, CircleDot, LoaderCircle, RotateCcw, Save, Send } from 'lucide-react'
import { cn, fmtRelative } from '../../lib/format'
import { Button } from './Button'

export interface PublishBarProps {
  /** Local edits not yet saved as a draft. */
  dirty: boolean
  /** Saved draft differs from the published version. */
  hasUnpublishedChanges?: boolean
  publishedAt?: string | null
  onSaveDraft?: () => void
  onPublish?: () => void
  onDiscard?: () => void
  saving?: boolean
  publishing?: boolean
  discarding?: boolean
  canPublish?: boolean
  canSave?: boolean
  /** Autosave indicator text instead of the Save button state. */
  autosave?: 'idle' | 'saving' | 'saved' | 'error'
  extra?: ReactNode
  discardLabel?: string
}

/**
 * Sticky action bar for draft/publish editors: shows unsaved edits,
 * "Published" or "Unpublished changes", and the Save draft / Publish actions.
 */
export function PublishBar({
  dirty,
  hasUnpublishedChanges,
  publishedAt,
  onSaveDraft,
  onPublish,
  onDiscard,
  saving,
  publishing,
  discarding,
  canPublish = true,
  canSave = true,
  autosave,
  extra,
  discardLabel = 'Discard changes',
}: PublishBarProps) {
  const state = dirty
    ? { label: 'Unsaved edits', tone: 'text-amber-300', icon: <CircleDot className="h-3.5 w-3.5" /> }
    : hasUnpublishedChanges
      ? { label: publishedAt ? 'Unpublished changes' : 'Never published', tone: 'text-amber-300', icon: <CircleDot className="h-3.5 w-3.5" /> }
      : { label: 'Published', tone: 'text-emerald-300', icon: <CircleCheck className="h-3.5 w-3.5" /> }

  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky bottom-0 z-30 -mx-4 mt-8 border-t border-line bg-[#0d1017]/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
      role="region"
      aria-label="Save and publish"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3 text-[13px]" aria-live="polite">
          <span className={cn('inline-flex items-center gap-1.5 font-medium', state.tone)}>
            {state.icon}
            {state.label}
          </span>
          {autosave === 'saving' && (
            <span className="inline-flex items-center gap-1 text-muted">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Saving…
            </span>
          )}
          {autosave === 'saved' && <span className="text-muted">Draft saved</span>}
          {autosave === 'error' && <span className="text-rose-300">Autosave failed</span>}
          {publishedAt && <span className="hidden font-mono text-[11px] text-dim sm:inline">Last published {fmtRelative(publishedAt)}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {extra}
          {onDiscard && (dirty || hasUnpublishedChanges) && (
            <Button variant="ghost" size="sm" onClick={onDiscard} loading={discarding} icon={<RotateCcw className="h-3.5 w-3.5" />}>
              {discardLabel}
            </Button>
          )}
          {onSaveDraft && (
            <Button variant="secondary" size="sm" onClick={onSaveDraft} loading={saving} disabled={!dirty || !canSave} icon={<Save className="h-3.5 w-3.5" />}>
              Save draft
            </Button>
          )}
          {onPublish && (
            <Button
              variant="primary"
              size="sm"
              onClick={onPublish}
              loading={publishing}
              disabled={!canPublish || (!dirty && !hasUnpublishedChanges)}
              title={!canPublish ? 'You do not have permission to publish' : undefined}
              icon={<Send className="h-3.5 w-3.5" />}
            >
              {dirty ? 'Save & publish' : 'Publish'}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
