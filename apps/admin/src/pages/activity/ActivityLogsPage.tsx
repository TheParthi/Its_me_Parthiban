import { useMemo, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { ChevronDown, FileClock, RotateCcw } from 'lucide-react'
import { get } from '../../lib/api'
import { useDebounced } from '../../lib/forms'
import { cn, fmtDateTime } from '../../lib/format'
import type { AuditPage, AuditRow } from '../../lib/types'
import { Button, DataTable, EmptyState, Input, PageHeader, Select, type Column } from '../../components/ui'
import { JsonBlock, Mono, SuccessBadge } from '../../components/admin/shared'

const ACTIONS = [
  { value: '', label: 'All actions' },
  { value: 'auth.', label: 'Sign-in & auth' },
  { value: 'user.', label: 'Users' },
  { value: 'project.', label: 'Projects' },
  { value: 'profile.', label: 'Profile' },
  { value: 'homepage.', label: 'Homepage' },
  { value: 'appearance.', label: 'Appearance' },
  { value: 'seo.', label: 'SEO' },
  { value: 'skill', label: 'Skills & categories' },
  { value: 'experience.', label: 'Experience' },
  { value: 'education.', label: 'Education' },
  { value: 'certification', label: 'Certifications' },
  { value: 'achievement', label: 'Achievements' },
  { value: 'media.', label: 'Media' },
  { value: 'message.', label: 'Messages' },
  { value: 'settings.', label: 'Settings' },
  { value: 'security.', label: 'Security' },
  { value: 'backup.', label: 'Backup' },
  { value: 'preview.', label: 'Preview links' },
] as const
type ActionPrefix = (typeof ACTIONS)[number]['value']
type SuccessFilter = '' | 'true' | 'false'

/** `yyyy-mm-dd` from a date input → ISO at local start/end of that day. */
const dayIso = (d: string, end: boolean) => (d ? new Date(`${d}T${end ? '23:59:59.999' : '00:00:00'}`).toISOString() : undefined)

const columns: Column<AuditRow>[] = [
  { key: 'time', header: 'Time', cell: (r) => <span className="whitespace-nowrap">{fmtDateTime(r.createdAt)}</span> },
  {
    key: 'action',
    header: 'Action',
    primary: true,
    cell: (r) => (
      <span className="flex items-center gap-2">
        <Mono className="text-fg">{r.action}</Mono>
      </span>
    ),
  },
  { key: 'actor', header: 'Actor', cell: (r) => <span className="break-all">{r.actorEmail ?? (r.actorId ? <Mono>{r.actorId}</Mono> : <span className="text-dim">system / anonymous</span>)}</span> },
  {
    key: 'resource',
    header: 'Resource',
    cell: (r) =>
      r.resourceType ? (
        <span className="text-muted">
          {r.resourceType}
          {r.resourceId && <Mono className="ml-1.5 text-dim">{r.resourceId.length > 14 ? `${r.resourceId.slice(0, 12)}…` : r.resourceId}</Mono>}
        </span>
      ) : (
        <span className="text-dim">—</span>
      ),
  },
  { key: 'success', header: 'Result', cell: (r) => <SuccessBadge success={r.success} /> },
  { key: 'ip', header: 'IP prefix', hideOnMobile: true, cell: (r) => (r.ipPrefix ? <Mono>{r.ipPrefix}</Mono> : <span className="text-dim">—</span>) },
]

export default function ActivityLogsPage() {
  const [search, setSearch] = useState('')
  const [action, setAction] = useState<ActionPrefix>('')
  const [success, setSuccess] = useState<SuccessFilter>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [open, setOpen] = useState<Set<string>>(new Set())
  const q = useDebounced(search.trim(), 300)
  const rangeError = from && to && from > to ? 'Start date is after end date' : null

  const filters = { q: q || undefined, action: action || undefined, success: success || undefined, from: dayIso(from, false), to: dayIso(to, true) }
  const list = useInfiniteQuery({
    queryKey: ['audit', filters],
    enabled: !rangeError,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => get<AuditPage>('/admin/audit', { ...filters, cursor: pageParam, limit: 50 }, signal),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
  const rows = useMemo(() => list.data?.pages.flatMap((p) => p.items), [list.data])
  const filtered = !!(q || action || success || from || to)

  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const cols: Column<AuditRow>[] = [
    ...columns,
    {
      key: 'more',
      header: <span className="sr-only">Details</span>,
      className: 'w-8 text-right',
      hideOnMobile: true,
      cell: (r) => (
        <button type="button" onClick={(e) => (e.stopPropagation(), toggle(r.id))} aria-expanded={open.has(r.id)} aria-label="Show details" className="grid h-7 w-7 place-items-center rounded-md text-dim hover:bg-white/5 hover:text-fg">
          <ChevronDown className={cn('h-4 w-4 transition-transform', open.has(r.id) && 'rotate-180')} />
        </button>
      ),
    },
  ]

  const reset = () => {
    setSearch('')
    setAction('')
    setSuccess('')
    setFrom('')
    setTo('')
  }

  return (
    <div>
      <PageHeader title="Activity Logs" description="An append-only record of every administrative action and sign-in. Click a row to see its details." />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))_auto] lg:items-end">
        <Input containerClassName="col-span-2 lg:col-span-1" label="Search" type="search" placeholder="Action, email, resource…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select label="Area" value={action} options={ACTIONS} onChange={setAction} />
        <Select<SuccessFilter>
          label="Result"
          value={success}
          onChange={setSuccess}
          options={[
            { value: '', label: 'Any result' },
            { value: 'true', label: 'Succeeded' },
            { value: 'false', label: 'Failed' },
          ]}
        />
        <Input label="From" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} error={rangeError} />
        <Input label="To" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        <Button variant="ghost" className="col-span-2 justify-self-end lg:col-span-1" onClick={reset} disabled={!filtered} icon={<RotateCcw className="h-4 w-4" />}>
          Reset
        </Button>
      </div>

      <DataTable
        columns={cols}
        rows={rangeError ? [] : rows}
        getRowId={(r) => r.id}
        loading={list.isLoading}
        error={list.error}
        onRetry={() => list.refetch()}
        onRowClick={(r) => toggle(r.id)}
        rowClassName={(r) => (!r.success ? 'bg-rose-500/[0.03]' : undefined)}
        caption="Audit log"
        expanded={(r) =>
          open.has(r.id) ? (
            <div className="grid gap-3 md:grid-cols-[220px_1fr]">
              <dl className="space-y-1 text-xs">
                <div><dt className="inline text-dim">Entry </dt><dd className="inline"><Mono>#{r.id}</Mono></dd></div>
                {r.actorId && <div><dt className="inline text-dim">Actor id </dt><dd className="inline break-all"><Mono>{r.actorId}</Mono></dd></div>}
                {r.resourceId && <div><dt className="inline text-dim">Resource id </dt><dd className="inline break-all"><Mono>{r.resourceId}</Mono></dd></div>}
                {r.ipPrefix && <div><dt className="inline text-dim">IP prefix </dt><dd className="inline"><Mono>{r.ipPrefix}</Mono></dd></div>}
              </dl>
              {r.metadata == null ? <p className="text-xs text-dim">No metadata recorded.</p> : <JsonBlock value={r.metadata} />}
            </div>
          ) : null
        }
        empty={
          <EmptyState
            icon={<FileClock className="h-5 w-5" />}
            title={filtered ? 'No entries match these filters' : 'No activity yet'}
            description={filtered ? 'Widen the date range or clear filters.' : 'Actions in the admin will be recorded here.'}
            action={filtered ? <Button size="sm" onClick={reset}>Clear filters</Button> : undefined}
          />
        }
      />

      {rows && rows.length > 0 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="mono-meta">{rows.length} entries shown</p>
          {list.hasNextPage ? (
            <Button onClick={() => list.fetchNextPage()} loading={list.isFetchingNextPage}>
              Load more
            </Button>
          ) : (
            <p className="text-xs text-dim">End of log</p>
          )}
        </div>
      )}
    </div>
  )
}
