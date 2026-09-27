import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ExternalLink, FileText, FolderOpen, Trash, Upload } from 'lucide-react'
import { ImageUploader } from '../../components/media/ImageUploader'
import { MediaPicker } from '../../components/media/MediaPicker'
import { FormSection } from '../../components/profile/FormSection'
import { Button, Skeleton, useToast } from '../../components/ui'
import { fmtBytes } from '../../lib/format'
import { qk, useMediaAsset } from '../../lib/queries'
import { MAX_UPLOAD_BYTES, uploadMedia } from '../../lib/upload'
import type { SectionProps } from './shared'

export function MediaSection({ p, set, err, disabled }: SectionProps) {
  return (
    <FormSection id="media" title="Photo, cover & resume" description="Images are cropped and converted to WebP in your browser before upload.">
      <div className="grid gap-5 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
        <div className="w-full max-w-[14rem]">
          <ImageUploader
            label="Profile photo"
            hint="Square (1:1) or portrait (4:5)."
            value={p.photoId}
            onChange={(id) => set(['photoId'], id)}
            category="PROFILE"
            aspect="1:1"
            aspects={['1:1', '4:5']}
            previewClassName="aspect-[4/5]"
            alt={p.fullName}
            error={err('photoId')}
            disabled={disabled}
          />
        </div>
        <ImageUploader
          label="Cover image"
          hint="Wide 16:9 banner."
          value={p.coverId}
          onChange={(id) => set(['coverId'], id)}
          category="PROFILE"
          aspect="16:9"
          aspects={['16:9']}
          previewClassName="aspect-video"
          alt={`${p.fullName} cover`}
          error={err('coverId')}
          disabled={disabled}
        />
      </div>
      <ResumeField value={p.resumeId ?? null} onChange={(id) => set(['resumeId'], id)} error={err('resumeId')} disabled={disabled} />
    </FormSection>
  )
}

function ResumeField({ value, onChange, error, disabled }: { value: string | null; onChange: (id: string | null) => void; error?: string; disabled: boolean }) {
  const [picker, setPicker] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const asset = useMediaAsset(value)
  const toast = useToast()
  const qc = useQueryClient()

  const upload = async (f: File | undefined) => {
    if (!f) return
    if (f.type !== 'application/pdf') return toast.error('File not accepted', `${f.name}: the resume must be a PDF`)
    if (f.size > MAX_UPLOAD_BYTES) return toast.error('File not accepted', `${f.name}: larger than 10 MB`)
    setProgress(0)
    try {
      const m = await uploadMedia(f, { category: 'DOCUMENT', fileName: f.name, onProgress: setProgress })
      qc.setQueryData(qk.mediaItem(m.id), m)
      qc.invalidateQueries({ queryKey: qk.media() })
      onChange(m.id)
      toast.success('Resume uploaded', `${f.name} · ${fmtBytes(f.size)}`)
    } catch (e) {
      toast.fromError(e, 'Upload failed')
    } finally {
      setProgress(null)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-[#d5d9e1]">Resume (PDF)</span>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-[#0f121a] px-3 py-2.5">
        <FileText className="h-5 w-5 shrink-0 text-muted" aria-hidden />
        <div className="min-w-[12rem] flex-1 text-sm">
          {progress !== null ? (
            <span className="text-muted">Uploading… {Math.round(progress * 100)}%</span>
          ) : !value ? (
            <span className="text-muted">No resume attached — the download button is hidden on the site.</span>
          ) : asset.isLoading ? (
            <Skeleton className="h-4 w-40" />
          ) : asset.data ? (
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-fg">{asset.data.originalName || asset.data.fileName}</span>
              <span className="shrink-0 font-mono text-[11px] text-dim">{fmtBytes(asset.data.size)}</span>
              <a href={asset.data.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted hover:text-fg" aria-label="Open resume">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </span>
          ) : (
            <span className="text-rose-300">The attached file ({value}) is no longer in the library.</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button size="xs" variant="secondary" disabled={disabled || progress !== null} onClick={() => input.current?.click()} icon={<Upload className="h-3 w-3" />}>
            Upload PDF
          </Button>
          <Button size="xs" variant="ghost" disabled={disabled || progress !== null} onClick={() => setPicker(true)} icon={<FolderOpen className="h-3 w-3" />}>
            Library
          </Button>
          {value && (
            <Button size="xs" variant="ghost" className="hover:text-rose-300" disabled={disabled} onClick={() => onChange(null)} icon={<Trash className="h-3 w-3" />}>
              Remove
            </Button>
          )}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          void upload(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {error && (
        <p className="text-xs text-rose-300" role="alert">
          {error}
        </p>
      )}
      <MediaPicker open={picker} onClose={() => setPicker(false)} type="document" title="Choose a resume PDF" onPick={([m]) => m && onChange(m.id)} />
    </div>
  )
}
