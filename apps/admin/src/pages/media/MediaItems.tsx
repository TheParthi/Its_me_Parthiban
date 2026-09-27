import { FileText } from 'lucide-react'
import { cn, fmtBytes, fmtDate } from '../../lib/format'
import type { MediaAsset } from '../../lib/types'
import { Badge } from '../../components/ui'
import { CATEGORY_LABELS, isPdf } from './mediaApi'

function Thumb({ m, className }: { m: MediaAsset; className?: string }) {
  if (isPdf(m))
    return (
      <div className={cn('grid place-items-center bg-gradient-to-br from-rose-500/10 to-white/[0.02] text-rose-200', className)}>
        <FileText className="h-8 w-8" aria-hidden />
      </div>
    )
  return <img src={m.url} alt={m.alt || ''} loading="lazy" className={cn('object-cover', className)} />
}

const dims = (m: MediaAsset) => (m.width && m.height ? `${m.width}×${m.height}` : isPdf(m) ? 'PDF' : '—')

export function MediaGrid({ items, onOpen }: { items: MediaAsset[]; onOpen: (m: MediaAsset) => void }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {items.map((m) => (
        <li key={m.id}>
          <button
            type="button"
            onClick={() => onOpen(m)}
            className="group block w-full overflow-hidden rounded-xl border border-line bg-card text-left transition-colors hover:border-white/20 focus-visible:outline-2 focus-visible:outline-accent"
          >
            <div className="aspect-square overflow-hidden bg-[repeating-conic-gradient(#1a1f2b_0%_25%,#151923_0%_50%)] bg-[length:16px_16px]">
              <Thumb m={m} className="h-full w-full transition-transform duration-300 group-hover:scale-[1.03]" />
            </div>
            <div className="space-y-1 p-2.5">
              <p className="truncate text-[12.5px] font-medium text-fg" title={m.fileName}>
                {m.fileName}
              </p>
              <div className="flex items-center justify-between gap-2 font-mono text-[10.5px] text-dim">
                <span>{dims(m)}</span>
                <span>{fmtBytes(m.size)}</span>
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}

export function MediaListView({ items, onOpen }: { items: MediaAsset[]; onOpen: (m: MediaAsset) => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card">
      <div className="hidden grid-cols-[56px_minmax(0,1fr)_110px_100px_90px_110px] gap-3 border-b border-line px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-dim md:grid">
        <span />
        <span>Name</span>
        <span>Category</span>
        <span>Dimensions</span>
        <span>Size</span>
        <span>Uploaded</span>
      </div>
      <ul className="divide-y divide-line">
        {items.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => onOpen(m)}
              className="grid w-full grid-cols-[48px_minmax(0,1fr)] items-center gap-3 px-3 py-2 text-left hover:bg-white/[0.03] focus-visible:outline-2 focus-visible:outline-accent md:grid-cols-[56px_minmax(0,1fr)_110px_100px_90px_110px]"
            >
              <div className="h-12 w-12 overflow-hidden rounded-md bg-white/[0.04] md:h-14 md:w-14">
                <Thumb m={m} className="h-full w-full" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] text-fg">{m.fileName}</p>
                <p className="truncate text-xs text-muted">{isPdf(m) ? 'PDF document' : m.alt || <span className="text-dim italic">No alt text</span>}</p>
                <p className="mt-0.5 font-mono text-[10.5px] text-dim md:hidden">
                  {CATEGORY_LABELS[m.category]} · {dims(m)} · {fmtBytes(m.size)} · {fmtDate(m.createdAt)}
                </p>
              </div>
              <span className="hidden md:block">
                <Badge tone={m.category === 'DOCUMENT' ? 'rose' : 'neutral'}>{CATEGORY_LABELS[m.category]}</Badge>
              </span>
              <span className="hidden font-mono text-xs text-muted md:block">{dims(m)}</span>
              <span className="hidden font-mono text-xs text-muted md:block">{fmtBytes(m.size)}</span>
              <span className="hidden text-xs text-muted md:block">{fmtDate(m.createdAt)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
