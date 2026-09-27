import { useState } from 'react'
import type { ZodType } from 'zod'
import { useCan } from '../../lib/auth'
import { serverErrors, useDraftForm, useUnsavedWarning, zodErrors } from '../../lib/forms'
import { useDocument, useDocumentMutations } from '../../lib/queries'
import type { DocumentKey, DocumentResponse } from '../../lib/types'
import { useToast } from '../ui'

/**
 * Shared editor state for the site-configuration singletons (homepage,
 * appearance): local draft, schema validation, save / publish / discard with
 * toasts, and permission flags (site:write + content:publish).
 */
export function useSiteDocument<T>(key: DocumentKey, schema: ZodType, label: string) {
  const doc = useDocument<T>(key)
  const form = useDraftForm<T>(doc.data?.draft, schema)
  const { save, publish, discard } = useDocumentMutations<T>(key)
  const toast = useToast()
  const can = useCan()
  const [issues, setIssues] = useState<string[]>([])
  useUnsavedWarning(form.dirty)

  const canWrite = can('site:write')
  const canPublish = canWrite && can('content:publish')

  /** Validate locally; on failure list every issue and return null. */
  const check = (): T | null => {
    const errs = zodErrors(schema, form.value)
    if (errs) {
      form.setErrors(errs)
      setIssues(Object.entries(errs).map(([k, m]) => (k === '_form' ? m : `${k}: ${m}`)))
      return null
    }
    setIssues([])
    return (schema.parse(form.value) as T) ?? null
  }

  const onServerError = (err: unknown, title: string) => {
    const fe = serverErrors(err)
    if (fe) {
      form.setErrors(fe)
      setIssues(Object.entries(fe).map(([k, m]) => (k === '_form' ? m : `${k}: ${m}`)))
    }
    toast.fromError(err, title)
  }

  const saveDraft = async (quiet = false): Promise<DocumentResponse<T> | null> => {
    const data = check()
    if (!data) {
      toast.error('Fix the highlighted issues first')
      return null
    }
    try {
      const r = await save.mutateAsync(data)
      form.reset(r.draft)
      if (!quiet) toast.success(`${label} draft saved`, 'The live site is unchanged until you publish.')
      return r
    } catch (err) {
      onServerError(err, 'Could not save the draft')
      return null
    }
  }

  const doPublish = async () => {
    if (form.dirty && !(await saveDraft(true))) return
    try {
      const r = await publish.mutateAsync()
      form.reset(r.draft)
      toast.success(`${label} published`, 'The website now uses these settings.')
    } catch (err) {
      onServerError(err, 'Publish failed')
    }
  }

  /** Drop local edits; if the saved draft differs from live, revert it too. */
  const doDiscard = async () => {
    const d = doc.data
    try {
      if (d?.hasUnpublishedChanges && d.published) {
        const r = await discard.mutateAsync()
        form.reset(r.draft)
      } else if (d) form.reset(d.draft)
      setIssues([])
      toast.success('Changes discarded')
    } catch (err) {
      toast.fromError(err, 'Could not discard changes')
    }
  }

  /** Reload the form from the server (e.g. after a version restore). */
  const reload = async () => {
    const r = await doc.refetch()
    if (r.data) form.reset(r.data.draft)
  }

  return {
    doc,
    form,
    issues,
    setIssues,
    canWrite,
    canPublish,
    saveDraft,
    publish: doPublish,
    discard: doDiscard,
    reload,
    saving: save.isPending,
    publishing: publish.isPending,
    discarding: discard.isPending,
  }
}
