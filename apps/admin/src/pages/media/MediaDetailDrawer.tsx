import { useRef, useState } from 'react'
import { Copy, ExternalLink, FileText, RefreshCw, Save, Trash2 } from 'lucide-react'
import { ApiError } from '../../lib/api'
import { useCan } from '../../lib/auth'
import { serverErrors, type FieldErrors } from '../../lib/forms'
import { copyText, fmtBytes, fmtDateTime } from '../../lib/format'
import { useDeleteMedia, useMediaUsage } from '../../lib/queries'
import { validateMediaFile } from '../../lib/upload'
import type { MediaAsset, MediaCategory, MediaUsage } from '../../lib/types'
import { Button, Callout, ConfirmDialog, Drawer, Input, KeyValue, Select, useToast } from '../../components/ui'
import { categoryOptions, isPdf, uploadErrorMessage, useReplaceMedia, useUpdateMedia } from './mediaApi'
import { UsageList } from './UsageList'

export function MediaDetailDrawer({ asset, onClose }: { asset: MediaAsset | null; onClose: () => void }) {
  return (
    <Drawer open={!!asset} onClose={onClose} title={asset?.fileName ?? 'File'} description="Details, alt text, usage and replacement" width="lg">
      {asset && <Body key={`${asset.id}-${asset.updatedAt}`} asset={asset} onClose={onClose} />}
    </Drawer>
  )
}

function Body({ asset, onClose }: { asset: MediaAsset; onClose: () => void }) {
  const can = useCan()
  const toast = useToast()
  const canWrite = can('media:write')
  const canDelete = can('media:delete')
  const [alt, setAlt] = useState(asset.alt ?? '')
  const [fileName, setFileName] = useState(asset.fileName)
  const [category, setCategory] = useState<MediaCategory>(asset.category)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [confirm, setConfirm] = useState(false)
  const [conflict, setConflict] = useState<{ message: string; usage: MediaUsage[] } | null>(null)
  const [replaceProgress, setReplaceProgress] = useState<number | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  // Stop usage lookups once a delete is in flight (the asset is about to 404).
  const [gone, setGone] = useState(false)
  const usage = useMediaUsage(gone ? null : asset.id)
  const update = useUpdateMedia()
  const replace = useReplaceMedia()
  const remove = useDeleteMedia()

  const dirty = alt !== (asset.alt ?? '') || fileName !== asset.fileName || category !== asset.category
  const used = (usage.data?.length ?? 0) > 0

  const save = async () => {
    const body: Record<string, string> = {}
    if (alt !== (asset.alt ?? '')) body.alt = alt.trim()
    if (fileName !== asset.fileName) {
      if (!fileName.trim()) return setErrors({ fileName: 'A display name is required' })
      body.fileName = fileName.trim()
    }
    if (category !== asset.category) body.category = category
    try {
      await update.mutateAsync({ id: asset.id, body })
      setErrors({})
      toast.success('File details saved')
    } catch (err) {
      const fe = serverErrors(err)
      if (fe) setErrors(fe)
      toast.fromError(err, 'Could not save details')
    }
  }

  const doReplace = async (file: File) => {
    const err = validateMediaFile(file)
    if (err) return toast.error('Cannot replace', err)
    setReplaceProgress(0)
    try {
      await replace.mutateAsync({ id: asset.id, file, onProgress: setReplaceProgress })
      toast.success('File replaced', 'Every place that uses it now shows the new file.')
    } catch (e) {
      toast.error('Replace failed', uploadErrorMessage(e))
    } finally {
      setReplaceProgress(null)
    }
  }

  const doDelete = async () => {
    setGone(true)
    try {
      await remove.mutateAsync(asset.id)
      toast.success('File deleted')
      setConfirm(false)
      onClose()
    } catch (err) {
      setGone(false)
      setConfirm(false)
      if (err instanceof ApiError && err.status === 409) {
        const b = err.body as { message?: string; usage?: MediaUsage[] } | null
        setConflict({ message: b?.message ?? err.message, usage: b?.usage ?? [] })
        usage.refetch()
      } else toast.fromError(err, 'Delete failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-line bg-[repeating-conic-gradient(#1a1f2b_0%_25%,#151923_0%_50%)] bg-[length:16px_16px]">
        {isPdf(asset) ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <FileText className="h-14 w-14 text-rose-200" aria-hidden />
            <a href={asset.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-accent-2 hover:underline">
              Open PDF <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>
        ) : (
          <img src={asset.url} alt={asset.alt || ''} className="mx-auto max-h-[46vh] w-auto object-contain" />
        )}
      </div>

      <KeyValue
        items={[
          ['Dimensions', asset.width && asset.height ? `${asset.width} × ${asset.height}px` : '—'],
          ['Size', fmtBytes(asset.size)],
          ['Type', <span className="font-mono text-xs">{asset.mimeType}</span>],
          ['Original name', <span className="break-all">{asset.originalName}</span>],
          ['Uploaded', fmtDateTime(asset.createdAt)],
          ...(asset.updatedAt !== asset.createdAt ? ([['Updated', fmtDateTime(asset.updatedAt)]] as [string, string][]) : []),
        ]}
      />

      <div className="flex items-center gap-2">
        <Input value={asset.url} readOnly aria-label="File URL" className="font-mono text-xs" containerClassName="flex-1" onFocus={(e) => e.target.select()} />
        <Button
          size="icon"
          variant="secondary"
          aria-label="Copy URL"
          title="Copy URL"
          onClick={async () => {
            const abs = new URL(asset.url, window.location.origin).toString()
            if (await copyText(abs)) toast.success('URL copied')
            else toast.error('Could not copy')
          }}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>

      <section className="space-y-3">
        <h3 className="eyebrow">Details</h3>
        {!isPdf(asset) && (
          <Input label="Alt text" value={alt} maxLength={200} showCount disabled={!canWrite} error={errors.alt} onChange={(e) => setAlt(e.target.value)} hint="Describes the image for screen readers and search engines." />
        )}
        <Input label="Display name" value={fileName} maxLength={200} disabled={!canWrite} error={errors.fileName} onChange={(e) => setFileName(e.target.value)} />
        <Select label="Category" value={category} onChange={setCategory} options={categoryOptions} disabled={!canWrite} error={errors.category} />
        <div className="flex flex-wrap justify-end gap-2">
          <input ref={fileInput} type="file" className="sr-only" tabIndex={-1} accept="image/jpeg,image/png,image/webp,image/avif,image/gif,application/pdf" onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) doReplace(f)
          }} />
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className="h-3.5 w-3.5" />}
            disabled={!canWrite}
            loading={replace.isPending}
            title={canWrite ? 'Upload new bytes under the same id' : 'You need media:write'}
            onClick={() => fileInput.current?.click()}
          >
            {replaceProgress != null ? `Replacing ${Math.round(replaceProgress * 100)}%` : 'Replace file'}
          </Button>
          <Button variant="primary" size="sm" icon={<Save className="h-3.5 w-3.5" />} disabled={!dirty || !canWrite} loading={update.isPending} onClick={save}>
            Save details
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="eyebrow">Used in</h3>
        <UsageList usage={usage.data} loading={usage.isLoading} error={usage.error} onRetry={() => usage.refetch()} />
      </section>

      <section className="space-y-3 border-t border-line pt-5">
        {conflict && (
          <Callout tone="danger" title={conflict.message}>
            {conflict.usage.length ? `Referenced by: ${conflict.usage.map((u) => `${u.type} “${u.title}”`).join(', ')}` : null}
          </Callout>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">
            {!canDelete
              ? 'You do not have permission to delete media.'
              : usage.isLoading
                ? 'Checking where this file is used…'
                : used
                  ? 'This file is used by your content. Remove it there before deleting.'
                  : 'Not used anywhere — safe to delete.'}
          </p>
          <Button
            variant="danger"
            size="sm"
            icon={<Trash2 className="h-3.5 w-3.5" />}
            disabled={!canDelete || used || usage.isLoading}
            title={used ? 'Remove it from the content listed above first' : undefined}
            onClick={() => setConfirm(true)}
          >
            Delete file
          </Button>
        </div>
      </section>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={doDelete}
        loading={remove.isPending}
        title="Delete this file?"
        description={`“${asset.fileName}” will be removed from storage permanently. This cannot be undone.`}
        confirmLabel="Delete permanently"
      />
    </div>
  )
}
