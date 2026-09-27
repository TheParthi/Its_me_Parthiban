import { useState } from 'react'
import { ImagePlus, LayoutGrid, List, Search, X } from 'lucide-react'
import { useCan } from '../../lib/auth'
import { useDebounced } from '../../lib/forms'
import { fmtNumber } from '../../lib/format'
import { useMediaList } from '../../lib/queries'
import type { MediaAsset, MediaCategory } from '../../lib/types'
import { Button, EmptyState, ErrorState, Input, PageHeader, Pagination, Segmented, Select, Skeleton } from '../../components/ui'
import { categoryOptions } from './mediaApi'
import { MediaDetailDrawer } from './MediaDetailDrawer'
import { MediaGrid, MediaListView } from './MediaItems'
import { UploadPanel } from './UploadPanel'

const PAGE_SIZE = 24
type View = 'grid' | 'list'

function readView(): View {
  try {
    return localStorage.getItem('pg.media.view') === 'list' ? 'list' : 'grid'
  } catch {
    return 'grid'
  }
}

/** yyyy-mm-dd (local) → ISO at the start or end of that day. */
const dayIso = (d: string, end: boolean) => (d ? new Date(`${d}T${end ? '23:59:59.999' : '00:00:00'}`).toISOString() : undefined)

export default function MediaLibraryPage() {
  const can = useCan()
  const canWrite = can('media:write')
  const [view, setViewState] = useState<View>(readView)
  const [q, setQ] = useState('')
  const [category, setCategory] = useState<MediaCategory | ''>('')
  const [type, setType] = useState<'' | 'image' | 'document'>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [uploading, setUploading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedFallback, setSelectedFallback] = useState<MediaAsset | null>(null)
  const search = useDebounced(q.trim(), 300)

  const list = useMediaList({
    q: search || undefined,
    category: category || undefined,
    type: type || undefined,
    from: dayIso(from, false),
    to: dayIso(to, true),
    page,
    pageSize: PAGE_SIZE,
  })

  const setView = (v: View) => {
    setViewState(v)
    try {
      localStorage.setItem('pg.media.view', v)
    } catch {
      /* per-viewer convenience only */
    }
  }
  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v)
    setPage(1)
  }
  const filtered = !!(search || category || type || from || to)
  const clear = () => {
    setQ('')
    setCategory('')
    setType('')
    setFrom('')
    setTo('')
    setPage(1)
  }

  const items = list.data?.items ?? []
  const selected = selectedId ? (items.find((m) => m.id === selectedId) ?? selectedFallback) : null
  const open = (m: MediaAsset) => {
    setSelectedId(m.id)
    setSelectedFallback(m)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Media Library"
        description="Every image and document used across the website. Replace a file once and it updates everywhere."
        meta={list.data ? <span className="mono-meta">{fmtNumber(list.data.total)} files</span> : undefined}
        actions={
          <Button
            variant="primary"
            icon={<ImagePlus className="h-4 w-4" />}
            onClick={() => setUploading((u) => !u)}
            disabled={!canWrite}
            title={canWrite ? undefined : 'You need the media:write permission to upload'}
          >
            Upload
          </Button>
        }
      />

      {uploading && <UploadPanel disabled={!canWrite} onClose={() => setUploading(false)} />}

      <div className="flex flex-col gap-3 rounded-xl border border-line bg-card p-3 lg:flex-row lg:flex-wrap lg:items-end">
        <Input
          aria-label="Search media"
          placeholder="Search name or alt text…"
          value={q}
          onChange={(e) => resetPage(setQ)(e.target.value)}
          leading={<Search className="h-4 w-4" />}
          containerClassName="lg:w-64"
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:contents">
          <Select aria-label="Category" value={category} onChange={resetPage(setCategory)} options={categoryOptions} placeholder="All categories" containerClassName="lg:w-40" />
          <Select
            aria-label="File type"
            value={type}
            onChange={resetPage(setType)}
            options={[
              { value: 'image', label: 'Images' },
              { value: 'document', label: 'Documents (PDF)' },
            ]}
            placeholder="All types"
            containerClassName="lg:w-40"
          />
          <Input type="date" label="From" value={from} max={to || undefined} onChange={(e) => resetPage(setFrom)(e.target.value)} containerClassName="lg:w-40" />
          <Input type="date" label="To" value={to} min={from || undefined} onChange={(e) => resetPage(setTo)(e.target.value)} containerClassName="lg:w-40" />
        </div>
        <div className="flex items-center justify-between gap-2 lg:ml-auto">
          {filtered ? (
            <Button variant="ghost" size="sm" icon={<X className="h-3.5 w-3.5" />} onClick={clear}>
              Clear filters
            </Button>
          ) : (
            <span />
          )}
          <Segmented
            aria-label="View"
            value={view}
            onChange={setView}
            options={[
              { value: 'grid', label: <span className="sr-only">Grid</span>, icon: <LayoutGrid className="h-4 w-4" />, title: 'Grid view' },
              { value: 'list', label: <span className="sr-only">List</span>, icon: <List className="h-4 w-4" />, title: 'List view' },
            ]}
          />
        </div>
      </div>

      {list.error ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} title="Could not load the media library" />
      ) : list.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="aspect-[4/5] rounded-xl" />
          ))}
        </div>
      ) : !items.length ? (
        filtered ? (
          <EmptyState icon={<Search className="h-5 w-5" />} title="No files match these filters" action={<Button size="sm" onClick={clear}>Clear filters</Button>} />
        ) : (
          <EmptyState
            icon={<ImagePlus className="h-5 w-5" />}
            title="Your media library is empty"
            description="Upload profile photos, project screenshots, icons and your résumé PDF."
            action={
              canWrite ? (
                <Button variant="primary" size="sm" onClick={() => setUploading(true)}>
                  Upload files
                </Button>
              ) : undefined
            }
          />
        )
      ) : (
        <div className={list.isFetching ? 'opacity-70 transition-opacity' : undefined}>
          {view === 'grid' ? <MediaGrid items={items} onOpen={open} /> : <MediaListView items={items} onOpen={open} />}
        </div>
      )}

      {list.data && list.data.total > PAGE_SIZE && <Pagination page={page} pageSize={PAGE_SIZE} total={list.data.total} onPage={setPage} />}

      <MediaDetailDrawer asset={selected} onClose={() => setSelectedId(null)} />
    </div>
  )
}
