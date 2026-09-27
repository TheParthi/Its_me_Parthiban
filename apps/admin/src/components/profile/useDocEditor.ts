import { useState } from 'react'
import type { Permission } from '@pg/shared'
import type { ZodType } from 'zod'
import { ApiError } from '../../lib/api'
import { useCan } from '../../lib/auth'
import { firstError, serverErrors, useDraftForm, useUnsavedWarning, zodErrors, type DraftForm, type FieldErrors } from '../../lib/forms'
import { useDocument, useDocumentMutations } from '../../lib/queries'
import type { DocumentKey } from '../../lib/types'
import { useToast } from '../ui'

/** Plain-language versions of zod's default messages. */
function friendly(errors: FieldErrors): FieldErrors {
  const out: FieldErrors = {}
  for (const [k, m] of Object.entries(errors)) {
    const min = /Too small: expected (?:string|array) to have >=(\d+)/.exec(m)
    const max = /Too big: expected (string|array) to have <=(\d+)/.exec(m)
    if (min) out[k] = min[1] === '1' ? 'Required' : `At least ${min[1]} needed`
    else if (max) out[k] = max[1] === 'string' ? `At most ${max[2]} characters` : `At most ${max[2]} items`
    else if (/Invalid URL/i.test(m)) out[k] = 'Enter a full URL starting with https://'
    else out[k] = m
  }
  return out
}

export interface DocEditor<T> {
  doc: ReturnType<typeof useDocument<T>>
  form: DraftForm<T | undefined>
  canSave: boolean
  canPublish: boolean
  canDiscard: boolean
  saving: boolean
  publishing: boolean
  discarding: boolean
  saveDraft: () => Promise<boolean>
  publish: () => Promise<void>
  /** Discard local edits and, when a published version exists, reset the draft to it. */
  discard: () => Promise<void>
  reload: () => Promise<void>
  /** A validation summary for the top of the form. */
  formError: string | null
}

/**
 * Draft/publish editor for a singleton document (profile, SEO…): validates
 * with the shared schema before saving and maps server issues onto fields.
 */
export function useDocEditor<T>(key: DocumentKey, schema: ZodType, fallback: T, perms: { write: Permission[]; publish: Permission[] }): DocEditor<T> {
  const doc = useDocument<T>(key)
  const { save, publish, discard } = useDocumentMutations<T>(key)
  const toast = useToast()
  const can = useCan()
  const initial = doc.data ? ((doc.data.draft ?? fallback) as T) : undefined
  const form = useDraftForm<T>(initial, schema)
  const [formError, setFormError] = useState<string | null>(null)
  useUnsavedWarning(form.dirty)

  const canSave = perms.write.every(can)
  const canPublish = perms.publish.every(can)

  const onError = (err: unknown, title: string) => {
    const fields = serverErrors(err)
    if (fields) {
      form.setErrors(friendly(fields))
      setFormError(firstError(fields))
    }
    toast.fromError(err, err instanceof ApiError && err.status === 422 ? 'The draft is not valid' : title)
  }

  const saveDraft = async (): Promise<boolean> => {
    setFormError(null)
    const data = form.validate()
    if (!data) {
      form.setErrors(friendly(zodErrors(schema, form.value) ?? {}))
      setFormError('Some fields need attention — fix the highlighted fields and save again.')
      toast.error('Check the form', 'Some fields are invalid.')
      return false
    }
    try {
      const r = await save.mutateAsync(data as T)
      form.reset(r.draft)
      toast.success('Draft saved', 'Visitors still see the published version until you publish.')
      return true
    } catch (err) {
      onError(err, 'Could not save the draft')
      return false
    }
  }

  const doPublish = async () => {
    if (form.dirty && !(await saveDraft())) return
    try {
      const r = await publish.mutateAsync()
      form.reset(r.draft)
      toast.success('Published', 'The public site now shows these changes.')
    } catch (err) {
      onError(err, 'Could not publish')
    }
  }

  const doDiscard = async () => {
    setFormError(null)
    if (!doc.data?.published) {
      form.reset(initial)
      toast.info('Local edits discarded')
      return
    }
    try {
      const r = await discard.mutateAsync()
      form.reset(r.draft)
      toast.success('Changes discarded', 'The draft now matches the published version.')
    } catch (err) {
      onError(err, 'Could not discard changes')
    }
  }

  const reload = async () => {
    const r = await doc.refetch()
    if (r.data) form.reset((r.data.draft ?? fallback) as T)
  }

  return {
    doc,
    form,
    canSave,
    canPublish,
    canDiscard: canSave,
    saving: save.isPending,
    publishing: publish.isPending,
    discarding: discard.isPending,
    saveDraft,
    publish: doPublish,
    discard: doDiscard,
    reload,
    formError: Object.keys(form.errors).length ? formError : null,
  }
}
