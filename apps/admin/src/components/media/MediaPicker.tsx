import { useState } from 'react'
import { Check, FileText, ImageOff, Search } from 'lucide-react'
import { cn, fmtBytes } from '../../lib/format'
import { useDebounced } from '../../lib/forms'
import { useMediaAsset, useMediaList } from '../../lib/queries'
import { MEDIA_CATEGORIES, type MediaAsset } from '../../lib/types'
import { Button, EmptyState, ErrorState, Modal, Pagination, Select, Skeleton } from '../ui'

export function isImage(m: Pick<MediaAsset, 'mimeType'> | null | undefined) {
  return !!m?.mimeType?.startsWith('image/')
}

/** Thumbnail for a media id (or asset). Never breaks layout when missing. */
export function MediaThumb({ id, asset, className, alt }: { id?: string | null; asset?: MediaAsset | null; className?: string; alt?: string }) {
  const q = useMediaAsset(asset ? null : id)
  const m = asset ?? q.data
  if (!id && !asset) return null
  if (q.isLoading) return <Skeleton className={cn('h-full w-full', className)} />
  if (!m)
    return (
      <div className={cn('grid place-items-center bg-white/[0.03] text-dim', className)} title={`Media ${id}`}>
        <ImageOff className="h-5 w-5" aria-hidden />
        <span className="sr-only">Media {id} could not be loaded</span>
      </div>
    )
  if (!isImage(m))
    return (
      <div className={cn('grid place-items-center bg-white/[0.03] text-muted', className)}>
        <FileText className="h-6 w-6" aria-hidden />
      </div>
    )
  return <img src={m.url} alt={alt ?? m.alt ?? ''} loading="lazy" className={cn('object-cover', className)} />
}

export interface MediaPickerProps {
  open: boolean
  onClose: () => void
  /** Called with the chosen ids (single mode returns one). */
  onPick: (assets: MediaAsset[]) => void
  multiple?: boolean
  type?: 'image' | 'document'
  category?: string
  title?: string
  initialSelected?: string[]
  max?: number
}

/** Modal for choosing existing assets from the media library. */
export function MediaPicker({ open, onClose, onPick, multiple, type = 'image', category: initialCategory = '', title, initialSelected = [], max }: MediaPickerProps) {
  return (
    <Modal open={open} onClose={onClose} size="xl" title={title ?? (multiple ? 'Choose media' : type === 'document' ? 'Choose a document' : 'Choose an image')}>
      {open && <PickerBody {...{ onClose, onPick, multiple, type, initialCategory, initialSelected, max }} />}
    </Modal>
  )
}

function PickerBody({
  onClose,
  onPick,
  multiple,
  type,
  initialCategory,
  initialSelected,
  max,
}: {
  onClose: () => void
  onPick: (a: MediaAsset[]) => void
  multiple?: boolean
  type: 'image' | 'document'
  initialCategory: string
  initialSelected: string[]
  max?: number
}) {
  const [q, setQ] = useState('')
  const [category, setCategory] = useState(initialCategory)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<MediaAsset[]>([])
  const dq = useDebounced(q, 300)
  const list = useMediaList({ q: dq, category, type, page, pageSize: 24 })
  const already = new Set(initialSelected)

  const toggle = (m: MediaAsset) => {
    if (!multiple) {
      onPick([m])
      onClose()
      return
    }
    setSelected((s) => (s.some((x) => x.id === m.id) ? s.filter((x) => x.id !== m.id) : max && s.length + already.size >= max ? s : [...s, m]))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
            placeholder="Search by name or alt text"
            aria-label="Search media"
            data-autofocus
            className="field-control h-9 w-full rounded-lg border border-line bg-[#0f121a] pl-9 pr-3 text-sm text-fg placeholder:text-dim focus:border-accent/70 focus:ring-2 focus:ring-accent/25"
          />
        </div>
        <Select
          aria-label="Category"
          value={category}
          onChange={(v) => {
            setCategory(v)
            setPage(1)
          }}
          options={[{ value: '', label: 'All categories' }, ...MEDIA_CATEGORIES.map((c) => ({ value: c, label: c.charAt(0) + c.slice(1).toLowerCase() }))]}
          containerClassName="w-44"
        />
      </div>

      {list.error ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : list.isLoading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      ) : !list.data?.items.length ? (
        <EmptyState title="No media found" description="Upload files in the Media Library, or use the uploader on this page." compact />
      ) : (
        <>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {list.data.items.map((m) => {
              const sel = selected.some((x) => x.id === m.id)
              const used = already.has(m.id)
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => !used && toggle(m)}
                    disabled={used}
                    aria-pressed={multiple ? sel : undefined}
                    title={m.originalName || m.fileName}
                    className={cn(
                      'group relative block aspect-square w-full overflow-hidden rounded-lg border bg-black/30 text-left transition',
                      sel ? 'border-accent ring-2 ring-accent/40' : 'border-line hover:border-line-2',
                      used && 'cursor-not-allowed opacity-40',
                    )}
                  >
                    <MediaThumb asset={m} className="h-full w-full" />
                    <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-4 text-[11px] text-white/90">
                      {m.originalName || m.fileName}
                    </span>
                    {sel && (
                      <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-accent text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                    {used && <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1 font-mono text-[10px] text-white">added</span>}
                    <span className="sr-only">
                      {m.width && m.height ? `${m.width}×${m.height}, ` : ''}
                      {fmtBytes(m.size)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <Pagination page={page} pageSize={24} total={list.data.total} onPage={setPage} />
        </>
      )}

      {multiple && (
        <div className="flex items-center justify-between border-t border-line pt-3">
          <span className="text-[13px] text-muted">{selected.length} selected</span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!selected.length}
              onClick={() => {
                onPick(selected)
                onClose()
              }}
            >
              Add {selected.length || ''}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
