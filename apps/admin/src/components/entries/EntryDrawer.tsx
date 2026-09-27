import { useState, type ReactNode } from 'react'
import type { ZodType } from 'zod'
import { ArchiveRestore, EyeOff, Save, Send, Trash2 } from 'lucide-react'
import { useCan } from '../../lib/auth'
import { serverErrors, zodErrors, useDraftForm, type FieldErrors } from '../../lib/forms'
import { fmtRelative } from '../../lib/format'
import type { AdminMeta } from '../../lib/types'
import { Button, Callout, ConfirmDialog, Drawer, useToast } from '../ui'
import { toDraft, type EntryMutations } from './api'
import { EntryBadges } from './EntryBadges'

export interface EntryForm<D> {
  value: D
  set: <K extends keyof D>(key: K, v: D[K]) => void
  errors: FieldErrors
  /** True when the user cannot edit (no permission, or item is in trash). */
  readOnly: boolean
}

export interface EntryDrawerProps<T extends AdminMeta, D> {
  open: boolean
  /** Changes each time the drawer is opened, so the form starts fresh. */
  session: number
  onClose: () => void
  /** Existing entry, or null to create a new one. */
  entry: T | null
  /** Lower-case singular noun for messages, e.g. "skill". */
  noun: string
  schema: ZodType
  blank: D
  mutations: EntryMutations<T>
  heading: (d: D) => string
  renderFields: (form: EntryForm<D>) => ReactNode
  /** Called with the saved entry (e.g. so the parent can keep it selected). */
  onSaved?: (e: T) => void
}

type Confirm = null | 'discard' | 'unpublish' | 'trash' | 'destroy'

/** Drawer editor shared by every draft/publish collection. */
export function EntryDrawer<T extends AdminMeta, D>(props: EntryDrawerProps<T, D>) {
  return <>{props.open && <EntryDrawerBody key={props.session} {...props} />}</>
}

function EntryDrawerBody<T extends AdminMeta, D>({ onClose, entry: initialEntry, noun, schema, blank, mutations: m, heading, renderFields, onSaved }: EntryDrawerProps<T, D>) {
  const toast = useToast()
  const can = useCan()
  const [entry, setEntry] = useState<T | null>(initialEntry)
  const form = useDraftForm<D>(entry ? toDraft<D>(entry) : blank, schema)
  const value = form.value as D
  const [confirm, setConfirm] = useState<Confirm>(null)
  const trashed = !!entry?.deletedAt
  const canWrite = can('content:write')
  const canPublish = can('content:publish')
  const canDelete = can('content:delete')
  const readOnly = !canWrite || trashed
  const busy = m.create.isPending || m.update.isPending || m.publish.isPending || m.unpublish.isPending

  const adopt = (saved: T) => {
    setEntry(saved)
    form.reset(toDraft<D>(saved))
    onSaved?.(saved)
  }

  /** Validates and saves; returns the saved entry or null. */
  const save = async (quiet = false): Promise<T | null> => {
    const data = form.validate()
    if (!data) {
      // Friendlier wording for empty required fields (zod's default is technical).
      const raw = zodIssues(schema, form.value)
      if (raw) form.setErrors(raw)
      toast.error('Please fix the highlighted fields')
      return null
    }
    try {
      const saved = entry ? await m.update.mutateAsync({ id: entry.id, body: data }) : await m.create.mutateAsync(data)
      adopt(saved)
      if (!quiet) toast.success(entry ? 'Draft saved' : `${cap(noun)} created as a draft`)
      return saved
    } catch (e) {
      const fe = serverErrors(e)
      if (fe) form.setErrors(fe)
      toast.fromError(e, 'Could not save')
      return null
    }
  }

  const publish = async () => {
    const saved = form.dirty || !entry ? await save(true) : entry
    if (!saved) return
    try {
      adopt(await m.publish.mutateAsync(saved.id))
      toast.success(`${cap(noun)} published`)
    } catch (e) {
      toast.fromError(e, 'Could not publish')
    }
  }

  const run = async (kind: Exclude<Confirm, null>) => {
    if (!entry && kind !== 'discard') return
    try {
      if (kind === 'discard') return onClose()
      if (kind === 'unpublish') {
        adopt(await m.unpublish.mutateAsync(entry!.id))
        toast.success(`${cap(noun)} unpublished — it is no longer shown publicly`)
      } else if (kind === 'trash') {
        await m.trash.mutateAsync(entry!.id)
        toast.success(`${cap(noun)} moved to trash`)
        onClose()
      } else {
        await m.destroy.mutateAsync(entry!.id)
        toast.success(`${cap(noun)} deleted permanently`)
        onClose()
      }
    } catch (e) {
      toast.fromError(e)
    } finally {
      setConfirm(null)
    }
  }

  const restore = async () => {
    if (!entry) return
    try {
      adopt(await m.restore.mutateAsync(entry.id))
      toast.success(`${cap(noun)} restored as it was`)
    } catch (e) {
      toast.fromError(e, 'Could not restore')
    }
  }

  const tryClose = () => (form.dirty ? setConfirm('discard') : onClose())
  const deny = (ok: boolean) => (ok ? undefined : 'You do not have permission for this')
  const published = entry?.status === 'PUBLISHED'

  const footer = trashed ? (
    <div className="flex w-full flex-wrap items-center justify-between gap-2">
      <Button variant="danger" onClick={() => setConfirm('destroy')} disabled={!canDelete} title={deny(canDelete)} icon={<Trash2 className="h-4 w-4" />}>
        Delete permanently
      </Button>
      <Button variant="primary" onClick={restore} loading={m.restore.isPending} disabled={!canDelete} title={deny(canDelete)} icon={<ArchiveRestore className="h-4 w-4" />}>
        Restore
      </Button>
    </div>
  ) : (
    <div className="flex w-full flex-wrap items-center justify-between gap-2">
      <div className="flex gap-2">
        {entry && (
          <Button variant="ghost" onClick={() => setConfirm('trash')} disabled={!canDelete || busy} title={deny(canDelete) ?? 'Move to trash'} icon={<Trash2 className="h-4 w-4" />}>
            <span className="max-sm:sr-only">Trash</span>
          </Button>
        )}
        {published && (
          <Button variant="ghost" onClick={() => setConfirm('unpublish')} disabled={!canPublish || busy} title={deny(canPublish)} icon={<EyeOff className="h-4 w-4" />}>
            Unpublish
          </Button>
        )}
      </div>
      <div className="flex gap-2">
        <Button onClick={() => save()} loading={m.create.isPending || m.update.isPending} disabled={!canWrite || busy || (!!entry && !form.dirty)} title={deny(canWrite)} icon={<Save className="h-4 w-4" />}>
          {entry ? 'Save draft' : 'Create draft'}
        </Button>
        <Button
          variant="primary"
          onClick={publish}
          loading={m.publish.isPending}
          disabled={!canPublish || busy || (published && !entry?.hasUnpublishedChanges && !form.dirty)}
          title={deny(canPublish)}
          icon={<Send className="h-4 w-4" />}
        >
          {published && !entry?.hasUnpublishedChanges && !form.dirty ? 'Published' : 'Publish'}
        </Button>
      </div>
    </div>
  )

  return (
    <>
      <Drawer
        open
        onClose={tryClose}
        title={heading(value) || (entry ? `Untitled ${noun}` : `New ${noun}`)}
        description={
          entry ? (
            <span className="flex flex-wrap items-center gap-2">
              <EntryBadges entry={{ ...entry, visible: (value as { visible?: boolean }).visible }} />
              <span className="text-xs text-dim">Saved {fmtRelative(entry.updatedAt)}</span>
              {form.dirty && <span className="text-xs text-amber-300">· Unsaved edits</span>}
            </span>
          ) : (
            `Creates a draft. It is not shown publicly until you publish it.`
          )
        }
        footer={footer}
      >
        <div className="space-y-5">
          {trashed && <Callout tone="warning" title="In trash">This {noun} is in the trash and hidden everywhere. Restore it to edit or publish.</Callout>}
          {!canWrite && !trashed && <Callout tone="info">You have read-only access to this {noun}.</Callout>}
          {form.errors._form && <Callout tone="danger">{form.errors._form}</Callout>}
          <fieldset disabled={readOnly} className="min-w-0 space-y-5">
            {renderFields({ value, set: (k, v) => form.set([k as string], v), errors: form.errors, readOnly })}
          </fieldset>
        </div>
      </Drawer>
      <ConfirmDialog
        open={confirm === 'discard'}
        onClose={() => setConfirm(null)}
        onConfirm={() => run('discard')}
        title="Discard unsaved edits?"
        description="Your changes to this draft have not been saved."
        confirmLabel="Discard"
      />
      <ConfirmDialog
        open={confirm === 'unpublish'}
        onClose={() => setConfirm(null)}
        onConfirm={() => run('unpublish')}
        tone="primary"
        title={`Unpublish this ${noun}?`}
        description="It will be removed from the public site. The draft is kept and can be published again."
        confirmLabel="Unpublish"
      />
      <ConfirmDialog
        open={confirm === 'trash'}
        onClose={() => setConfirm(null)}
        onConfirm={() => run('trash')}
        title={`Move this ${noun} to trash?`}
        description="It will disappear from the public site and the list. You can restore it from the trash."
        confirmLabel="Move to trash"
      />
      <ConfirmDialog
        open={confirm === 'destroy'}
        onClose={() => setConfirm(null)}
        onConfirm={() => run('destroy')}
        title={`Delete this ${noun} permanently?`}
        description="This removes it and its version history for good. This cannot be undone."
        confirmLabel="Delete permanently"
      />
    </>
  )
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Client validation errors with "Required" for empty required strings. */
function zodIssues(schema: ZodType, value: unknown) {
  const e = zodErrors(schema, value)
  if (!e) return null
  for (const k of Object.keys(e)) if (/expected string to have >=1/i.test(e[k])) e[k] = 'Required'
  return e
}
