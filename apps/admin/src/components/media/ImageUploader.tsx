import { useCallback, useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { useQueryClient } from '@tanstack/react-query'
import { Crop, ImagePlus, Images, RefreshCw, Trash, Upload } from 'lucide-react'
import { cn, fmtBytes } from '../../lib/format'
import { qk, useMediaAsset } from '../../lib/queries'
import { compressToWebp, uploadMedia, validateImageFile } from '../../lib/upload'
import type { MediaAsset, MediaCategory } from '../../lib/types'
import { Button, Modal, Segmented, useToast } from '../ui'
import { MediaPicker, MediaThumb } from './MediaPicker'

export type AspectPreset = '1:1' | '4:5' | '16:9' | 'og' | 'free'

export const ASPECTS: Record<AspectPreset, { label: string; ratio: number | null; out?: [number, number] }> = {
  '1:1': { label: '1:1', ratio: 1 },
  '4:5': { label: '4:5', ratio: 4 / 5 },
  '16:9': { label: '16:9', ratio: 16 / 9 },
  og: { label: '1200×630', ratio: 1200 / 630, out: [1200, 630] },
  free: { label: 'Free', ratio: null },
}

export interface ImageUploaderProps {
  label?: ReactNode
  hint?: ReactNode
  value: string | null | undefined
  onChange: (id: string | null, asset?: MediaAsset) => void
  category?: MediaCategory
  /** Default aspect in the cropper. */
  aspect?: AspectPreset
  /** Aspect choices offered; defaults to all. */
  aspects?: AspectPreset[]
  /** Shape of the preview box. */
  previewClassName?: string
  alt?: string
  error?: string | null
  disabled?: boolean
}

/**
 * Drag-and-drop or pick an image → validate type/size → crop & reposition →
 * compress to WebP in the browser → upload with progress. Or choose an
 * existing asset from the library.
 */
export function ImageUploader({
  label,
  hint,
  value,
  onChange,
  category = 'OTHER',
  aspect = 'free',
  aspects = ['1:1', '4:5', '16:9', 'og', 'free'],
  previewClassName = 'aspect-video',
  alt = '',
  error,
  disabled,
}: ImageUploaderProps) {
  const toast = useToast()
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [source, setSource] = useState<{ url: string; name: string; type: string } | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [picker, setPicker] = useState(false)
  const asset = useMediaAsset(value)

  useEffect(() => () => (source ? URL.revokeObjectURL(source.url) : undefined), [source])

  const accept = (f: File | undefined) => {
    if (!f) return
    const err = validateImageFile(f)
    if (err) return toast.error('File not accepted', err)
    setSource({ url: URL.createObjectURL(f), name: f.name, type: f.type })
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (!disabled) accept(e.dataTransfer.files?.[0])
  }

  const upload = async (blob: Blob, name: string) => {
    setProgress(0)
    try {
      const m = await uploadMedia(blob, { category, alt, fileName: name, onProgress: setProgress })
      qc.setQueryData(qk.mediaItem(m.id), m)
      qc.invalidateQueries({ queryKey: qk.media() })
      onChange(m.id, m)
      toast.success('Image uploaded', `${name} · ${fmtBytes(blob.size)}`)
    } catch (err) {
      toast.fromError(err, 'Upload failed')
    } finally {
      setProgress(null)
    }
  }

  const uploading = progress !== null

  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-[13px] font-medium text-[#d5d9e1]">{label}</span>}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          'relative overflow-hidden rounded-xl border bg-[#0f121a] transition-colors',
          dragOver ? 'border-accent bg-accent/5' : error ? 'border-rose-500/50' : 'border-line',
          previewClassName,
        )}
      >
        {value ? (
          <MediaThumb id={value} className="h-full w-full" />
        ) : (
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
            className="flex h-full min-h-32 w-full flex-col items-center justify-center gap-2 px-4 py-6 text-center text-muted hover:text-fg"
          >
            <ImagePlus className="h-6 w-6" aria-hidden />
            <span className="text-[13px]">
              <span className="font-medium text-fg">Drop an image</span> or click to browse
            </span>
            <span className="font-mono text-[10.5px] text-dim">JPEG · PNG · WebP · AVIF · GIF — max 10 MB</span>
          </button>
        )}
        {uploading && (
          <div className="absolute inset-0 grid place-items-center bg-black/70" role="status" aria-live="polite">
            <div className="w-2/3">
              <div className="mb-2 text-center text-xs text-fg">Uploading… {Math.round((progress ?? 0) * 100)}%</div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-gradient-to-r from-accent to-accent-2 transition-[width]" style={{ width: `${(progress ?? 0) * 100}%` }} />
              </div>
            </div>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" className="hidden" onChange={(e) => {
        accept(e.target.files?.[0])
        e.target.value = ''
      }} />
      <div className="flex flex-wrap items-center gap-1.5">
        <Button size="xs" variant="secondary" disabled={disabled || uploading} onClick={() => inputRef.current?.click()} icon={value ? <RefreshCw className="h-3 w-3" /> : <Upload className="h-3 w-3" />}>
          {value ? 'Replace' : 'Upload'}
        </Button>
        <Button size="xs" variant="ghost" disabled={disabled || uploading} onClick={() => setPicker(true)} icon={<Images className="h-3 w-3" />}>
          Library
        </Button>
        {value && (
          <Button size="xs" variant="ghost" disabled={disabled || uploading} onClick={() => onChange(null)} icon={<Trash className="h-3 w-3" />} className="hover:text-rose-300">
            Remove
          </Button>
        )}
        {asset.data && (
          <span className="ml-auto truncate font-mono text-[10.5px] text-dim">
            {asset.data.width && asset.data.height ? `${asset.data.width}×${asset.data.height} · ` : ''}
            {fmtBytes(asset.data.size)}
          </span>
        )}
      </div>
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p className="text-xs text-rose-300" role="alert">{error}</p>}

      <CropDialog
        source={source}
        defaultAspect={aspect}
        aspects={aspects}
        onCancel={() => setSource(null)}
        onDone={async (blob, name) => {
          setSource(null)
          await upload(blob, name)
        }}
      />
      <MediaPicker open={picker} onClose={() => setPicker(false)} onPick={([m]) => m && onChange(m.id, m)} category={category} />
    </div>
  )
}

function CropDialog({
  source,
  defaultAspect,
  aspects,
  onCancel,
  onDone,
}: {
  source: { url: string; name: string; type: string } | null
  defaultAspect: AspectPreset
  aspects: AspectPreset[]
  onCancel: () => void
  onDone: (blob: Blob, name: string) => void | Promise<void>
}) {
  const [aspect, setAspect] = useState<AspectPreset>(defaultAspect)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [natural, setNatural] = useState<number>(1)
  const [area, setArea] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (source) {
      setAspect(defaultAspect)
      setZoom(1)
      setCrop({ x: 0, y: 0 })
    }
  }, [source, defaultAspect])

  const onComplete = useCallback((_: Area, px: Area) => setArea(px), [])
  const preset = ASPECTS[aspect]
  const isGif = source?.type === 'image/gif'

  const finish = async () => {
    if (!source) return
    setBusy(true)
    try {
      const base = source.name.replace(/\.[^.]+$/, '') || 'image'
      const blob = await compressToWebp(source.url, area, preset.out ? { outWidth: preset.out[0], outHeight: preset.out[1] } : {})
      await onDone(blob, `${base}.webp`)
    } catch (err) {
      toast.fromError(err, 'Could not process the image')
    } finally {
      setBusy(false)
    }
  }

  const uploadOriginal = async () => {
    if (!source) return
    const blob = await fetch(source.url).then((r) => r.blob())
    await onDone(blob, source.name)
  }

  return (
    <Modal
      open={!!source}
      onClose={onCancel}
      size="lg"
      dismissable={!busy}
      title={
        <span className="flex items-center gap-2">
          <Crop className="h-4 w-4 text-accent-2" /> Crop & position
        </span>
      }
      description="Drag to reposition, scroll or use the slider to zoom. The result is converted to WebP before upload."
      footer={
        <>
          {isGif && (
            <Button variant="ghost" onClick={uploadOriginal} disabled={busy} className="mr-auto">
              Keep animated GIF
            </Button>
          )}
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={finish} loading={busy}>
            Crop & upload
          </Button>
        </>
      }
    >
      {source && (
        <div className="space-y-4">
          <div className="relative h-[46vh] min-h-64 overflow-hidden rounded-lg bg-black">
            <Cropper
              image={source.url}
              crop={crop}
              zoom={zoom}
              aspect={preset.ratio ?? natural}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onComplete}
              onMediaLoaded={(m) => setNatural(m.naturalWidth / m.naturalHeight)}
              showGrid
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented
              aria-label="Aspect ratio"
              size="sm"
              value={aspect}
              onChange={setAspect}
              options={aspects.map((a) => ({ value: a, label: ASPECTS[a].label }))}
            />
            <label className="flex items-center gap-2 text-xs text-muted">
              Zoom
              <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-36" aria-label="Zoom" />
            </label>
          </div>
          {area && (
            <p className="mono-meta">
              Output {preset.out ? `${preset.out[0]}×${preset.out[1]}` : `${Math.round(area.width)}×${Math.round(area.height)}`} px · WebP
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}
