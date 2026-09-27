import { useRef, useState, type DragEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CircleAlert, CircleCheck, FileText, UploadCloud, X } from 'lucide-react'
import { cn, fmtBytes } from '../../lib/format'
import { uploadMedia, validateMediaFile } from '../../lib/upload'
import type { MediaCategory } from '../../lib/types'
import { Button, Card, Input, Select, useToast } from '../../components/ui'
import { ACCEPT, categoryOptions, uploadErrorMessage } from './mediaApi'

interface QueueItem {
  key: string
  file: File
  progress: number
  state: 'queued' | 'uploading' | 'done' | 'error'
  error?: string
  preview?: string
}

/** Multi-file dropzone with per-file progress, category and alt text. */
export function UploadPanel({ disabled, onClose }: { disabled?: boolean; onClose: () => void }) {
  const [category, setCategory] = useState<MediaCategory | ''>('')
  const [alt, setAlt] = useState('')
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()
  const toast = useToast()

  const update = (key: string, patch: Partial<QueueItem>) => setQueue((q) => q.map((i) => (i.key === key ? { ...i, ...patch } : i)))

  const run = async (items: QueueItem[]) => {
    let ok = 0
    // Upload a few at a time so progress stays readable.
    const pending = [...items]
    const worker = async () => {
      for (let item = pending.shift(); item; item = pending.shift()) {
        const it = item
        update(it.key, { state: 'uploading', progress: 0 })
        try {
          await uploadMedia(it.file, {
            category: category || undefined,
            alt: alt.trim(),
            onProgress: (f) => update(it.key, { progress: f }),
          })
          update(it.key, { state: 'done', progress: 1 })
          ok++
        } catch (err) {
          update(it.key, { state: 'error', error: uploadErrorMessage(err), preview: undefined })
        }
      }
    }
    await Promise.all([worker(), worker(), worker()])
    if (ok) {
      qc.invalidateQueries({ queryKey: ['media'] })
      toast.success(ok === 1 ? 'File uploaded' : `${ok} files uploaded`)
    }
  }

  const add = (files: FileList | File[]) => {
    const list = Array.from(files)
    if (!list.length) return
    const items: QueueItem[] = list.map((file, i) => {
      const err = validateMediaFile(file)
      return {
        key: `${Date.now()}-${i}-${file.name}`,
        file,
        progress: 0,
        state: err ? 'error' : 'queued',
        error: err ?? undefined,
        preview: file.type.startsWith('image/') && !err ? URL.createObjectURL(file) : undefined,
      }
    })
    setQueue((q) => [...items, ...q])
    run(items.filter((i) => i.state === 'queued'))
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    if (!disabled) add(e.dataTransfer.files)
  }

  const busy = queue.some((i) => i.state === 'uploading' || i.state === 'queued')

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-fg">Upload files</h2>
          <p className="mt-0.5 text-xs text-muted">JPEG, PNG, WebP, AVIF, GIF or PDF · up to 10 MB each. Images are re-encoded and stripped of metadata.</p>
        </div>
        <Button size="icon-sm" variant="ghost" onClick={onClose} aria-label="Close upload panel" disabled={busy}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Category"
          value={category}
          onChange={setCategory}
          options={categoryOptions}
          placeholder="Automatic (Other / Document)"
          hint="Applied to every file in this batch."
        />
        <Input label="Alt text" value={alt} maxLength={200} onChange={(e) => setAlt(e.target.value)} placeholder="Describe the image for screen readers" hint="Optional — editable per file later." />
      </div>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label="Drop files here or press Enter to browse"
        onClick={() => !disabled && input.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault()
            input.current?.click()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center transition-colors focus-visible:outline-2 focus-visible:outline-accent',
          over ? 'border-accent bg-accent/10' : 'border-line-2 bg-white/[0.02] hover:border-white/25',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        )}
      >
        <UploadCloud className="h-7 w-7 text-accent-2" aria-hidden />
        <p className="text-sm text-fg">
          <span className="font-medium">Drop files</span> or click to browse
        </p>
        <p className="text-xs text-muted">Multiple files are uploaded in parallel</p>
        <input
          ref={input}
          type="file"
          multiple
          accept={ACCEPT}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            if (e.target.files) add(e.target.files)
            e.target.value = ''
          }}
        />
      </div>
      {queue.length > 0 && (
        <ul className="space-y-2" aria-live="polite">
          {queue.map((i) => (
            <li key={i.key} className="flex items-center gap-3 rounded-lg border border-line bg-white/[0.02] p-2.5">
              <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md bg-white/[0.04]">
                {i.preview ? <img src={i.preview} alt="" className="h-full w-full object-cover" onError={() => update(i.key, { preview: undefined })} /> : <FileText className="h-5 w-5 text-muted" aria-hidden />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[13px] text-fg">{i.file.name}</p>
                  <span className="shrink-0 font-mono text-[11px] text-dim">{fmtBytes(i.file.size)}</span>
                </div>
                {i.state === 'error' ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-rose-300" role="alert">
                    <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden /> {i.error}
                  </p>
                ) : i.state === 'done' ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-emerald-300">
                    <CircleCheck className="h-3.5 w-3.5" aria-hidden /> Uploaded
                  </p>
                ) : (
                  <div
                    className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"
                    role="progressbar"
                    aria-label={`Uploading ${i.file.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(i.progress * 100)}
                  >
                    <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-[width]" style={{ width: `${Math.max(4, i.progress * 100)}%` }} />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {queue.length > 0 && !busy && (
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" onClick={() => setQueue([])}>
            Clear list
          </Button>
        </div>
      )}
    </Card>
  )
}
