import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { History, RotateCcw } from 'lucide-react'
import { appearanceSchema, type Appearance } from '@pg/shared'
import { post } from '../../lib/api'
import { qk } from '../../lib/queries'
import type { DocumentResponse } from '../../lib/types'
import { PreviewFrame } from '../../components/preview/PreviewFrame'
import { useSiteDocument } from '../../components/site/useSiteDocument'
import { VersionHistory } from '../../components/versions/VersionHistory'
import { Button, Callout, ConfirmDialog, ErrorState, PageHeader, PageSkeleton, PublishBar, PublishStateBadge, useToast } from '../../components/ui'
import { ColorsPanel } from './ColorsPanel'
import { MiniPreview } from './MiniPreview'
import { LayoutPanel, TypographyPanel } from './StylePanels'
import { useGoogleFonts } from './fonts'

export default function AppearancePage() {
  const ed = useSiteDocument<Appearance>('appearance', appearanceSchema, 'Appearance')
  const { doc, form } = ed
  const qc = useQueryClient()
  const toast = useToast()
  const [history, setHistory] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const t = form.value?.typography
  useGoogleFonts(t ? [t.display, t.body, t.mono] : [])

  const reset = useMutation({
    mutationFn: () => post<DocumentResponse<Appearance>>('/admin/documents/appearance/reset'),
    onSuccess: (r) => {
      if (r && typeof r === 'object' && 'draft' in r) qc.setQueryData(qk.document('appearance'), r)
      qc.invalidateQueries({ queryKey: qk.document('appearance') })
    },
  })

  if (doc.error)
    return (
      <div className="space-y-5">
        <PageHeader title="Website Appearance" />
        <ErrorState error={doc.error} onRetry={() => doc.refetch()} title="Could not load appearance settings" />
      </div>
    )
  if (doc.isLoading || !form.value) return <PageSkeleton />

  const a = form.value
  const disabled = !ed.canWrite

  return (
    <div className="space-y-5">
      <PageHeader
        title="Website Appearance"
        description="Colours, typography and shape tokens for the public website. Changes stay in draft until you publish."
        meta={doc.data && <PublishStateBadge status={doc.data.status} hasUnpublishedChanges={doc.data.hasUnpublishedChanges} />}
        actions={
          <>
            <Button variant="secondary" size="sm" icon={<History className="h-4 w-4" />} onClick={() => setHistory(true)}>
              Version history
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<RotateCcw className="h-4 w-4" />}
              disabled={disabled}
              title={disabled ? 'You need the site:write permission' : 'Replace the draft with the default theme'}
              onClick={() => setConfirmReset(true)}
            >
              Reset to default
            </Button>
          </>
        }
      />

      {disabled && <Callout tone="warning" title="Read-only">You need the site:write permission to change the website appearance.</Callout>}
      {ed.issues.length > 0 && (
        <Callout tone="danger" title="Some values are invalid">
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {ed.issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </Callout>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <ColorsPanel colors={a.colors} errors={form.errors} disabled={disabled} onChange={(k, v) => form.set(['colors', k], v)} />
          <TypographyPanel value={a} set={form.set} disabled={disabled} />
          <LayoutPanel value={a} set={form.set} disabled={disabled} />
        </div>
        <div className="min-w-0 space-y-5 xl:sticky xl:top-20 xl:self-start">
          <MiniPreview a={a} />
          <div>
            <PreviewFrame version={doc.data?.updatedAt} height="h-[52vh]" />
            <p className="mt-2 text-xs text-muted">The token preview updates as you edit; the full-site preview shows the saved draft.</p>
          </div>
        </div>
      </div>

      <PublishBar
        dirty={form.dirty}
        hasUnpublishedChanges={doc.data?.hasUnpublishedChanges}
        publishedAt={doc.data?.publishedAt}
        onSaveDraft={() => ed.saveDraft()}
        onPublish={ed.publish}
        onDiscard={() => setConfirmDiscard(true)}
        saving={ed.saving}
        publishing={ed.publishing}
        discarding={ed.discarding}
        canSave={ed.canWrite}
        canPublish={ed.canPublish}
      />

      <ConfirmDialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={async () => {
          await ed.discard()
          setConfirmDiscard(false)
        }}
        loading={ed.discarding}
        title="Discard appearance changes?"
        description={doc.data?.hasUnpublishedChanges ? 'The draft will be reset to the published appearance.' : 'Your unsaved edits will be lost.'}
        confirmLabel="Discard"
      />
      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        loading={reset.isPending}
        title="Reset to the default theme?"
        description="The draft is replaced with the default colours, fonts and layout. The live site is unchanged until you publish."
        confirmLabel="Reset draft"
        onConfirm={async () => {
          try {
            const r = await reset.mutateAsync()
            const fresh = r && typeof r === 'object' && 'draft' in r ? r.draft : (await doc.refetch()).data?.draft
            if (fresh) form.reset(fresh)
            toast.success('Draft reset to the default theme', 'Publish to apply it to the website.')
            setConfirmReset(false)
          } catch (err) {
            toast.fromError(err, 'Reset failed')
          }
        }}
      />
      <VersionHistory open={history} onClose={() => setHistory(false)} entityType="appearance" entityId="APPEARANCE" title="Appearance versions" onRestored={ed.reload} />
    </div>
  )
}
