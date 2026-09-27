import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Archive, Download, MailOpen, Search, ShieldAlert, Trash2, X } from 'lucide-react'
import { MESSAGE_STATUS, type MessageStatus } from '@pg/shared'
import { useDebounced } from '../../lib/forms'
import { cn, downloadBlob } from '../../lib/format'
import { Button, Card, ConfirmDialog, PageHeader, Pagination, Tabs, useToast } from '../../components/ui'
import { Gate, usePerm } from '../../components/admin/shared'
import { MessageDetail, STATUS_LABELS } from './MessageDetail'
import { MessageList } from './MessageList'
import { useMessageActions, useMessages } from './messagesApi'

type Tab = 'ALL' | MessageStatus
const PAGE_SIZE = 25

export default function MessagesPage() {
  const [params, setParams] = useSearchParams()
  const openId = params.get('id')
  const [tab, setTab] = useState<Tab>('ALL')
  const [search, setSearch] = useState('')
  const q = useDebounced(search.trim(), 300)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState(false)
  const toast = useToast()
  const write = usePerm('messages:write')

  const list = useMessages({ status: tab === 'ALL' ? undefined : tab, q: q || undefined, page, pageSize: PAGE_SIZE })
  const { setStatus, remove, exportCsv } = useMessageActions()

  useEffect(() => {
    setPage(1)
    setSelected(new Set())
  }, [tab, q])

  const open = (id: string | null) => {
    const next = new URLSearchParams(params)
    if (id) next.set('id', id)
    else next.delete('id')
    setParams(next, { replace: !id })
  }

  const counts = list.data?.counts
  const total = counts ? MESSAGE_STATUS.reduce((n, s) => n + (counts[s] ?? 0), 0) : undefined
  const tabs = [
    { value: 'ALL' as Tab, label: 'All', count: total },
    ...MESSAGE_STATUS.map((s) => ({ value: s as Tab, label: STATUS_LABELS[s], count: counts?.[s] })),
  ]

  const ids = [...selected]
  const bulkStatus = (status: MessageStatus) =>
    setStatus.mutate(
      { ids, status },
      {
        onSuccess: (n) => {
          toast.success(`${n} message${n === 1 ? '' : 's'} marked as ${STATUS_LABELS[status].toLowerCase()}`)
          setSelected(new Set())
        },
        onError: (e) => toast.fromError(e, 'Some messages were not updated'),
      },
    )
  const doExport = () =>
    exportCsv.mutate(ids, {
      onSuccess: (blob) => {
        downloadBlob(blob, 'messages.csv')
        toast.success(`Exported ${ids.length} message${ids.length === 1 ? '' : 's'}`)
      },
      onError: (e) => toast.fromError(e, 'Export failed'),
    })

  const busy = setStatus.isPending || remove.isPending

  return (
    <div>
      <PageHeader title="Contact Messages" description="Messages from your portfolio’s contact form. Triage, reply by email and export." />

      <Tabs value={tab} onChange={setTab} items={tabs} aria-label="Message status" className="mb-4" />

      <div className="grid gap-4 lg:grid-cols-[minmax(320px,420px)_1fr]">
        <Card padded={false} className={cn('flex min-w-0 flex-col overflow-hidden', openId && 'hidden lg:flex')}>
          <div className="border-b border-line p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, subject or text…"
                aria-label="Search messages"
                className="field-control h-9 w-full rounded-lg border border-line bg-[#0f121a] pl-9 pr-3 text-sm text-fg placeholder:text-dim focus:border-accent/70 focus:ring-2 focus:ring-accent/25"
              />
            </div>
            {selected.size > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Bulk actions">
                <Gate reason={write.reason}>
                  <Button size="xs" disabled={!write.allowed || busy} onClick={() => bulkStatus('READ')} icon={<MailOpen className="h-3.5 w-3.5" />}>
                    Mark read
                  </Button>
                </Gate>
                <Gate reason={write.reason}>
                  <Button size="xs" disabled={!write.allowed || busy} onClick={() => bulkStatus('ARCHIVED')} icon={<Archive className="h-3.5 w-3.5" />}>
                    Archive
                  </Button>
                </Gate>
                <Gate reason={write.reason}>
                  <Button size="xs" disabled={!write.allowed || busy} onClick={() => bulkStatus('SPAM')} icon={<ShieldAlert className="h-3.5 w-3.5" />}>
                    Spam
                  </Button>
                </Gate>
                <Gate reason={write.reason}>
                  <Button size="xs" disabled={!write.allowed} loading={exportCsv.isPending} onClick={doExport} icon={<Download className="h-3.5 w-3.5" />}>
                    Export CSV
                  </Button>
                </Gate>
                <Gate reason={write.reason}>
                  <Button size="xs" variant="danger" disabled={!write.allowed || busy} onClick={() => setConfirmDelete(true)} icon={<Trash2 className="h-3.5 w-3.5" />}>
                    Delete
                  </Button>
                </Gate>
                <Button size="xs" variant="ghost" onClick={() => setSelected(new Set())} icon={<X className="h-3.5 w-3.5" />} aria-label="Clear selection" />
              </div>
            )}
          </div>
          <div className={cn('min-h-0 flex-1 transition-opacity', list.isPlaceholderData && 'opacity-60')}>
            <MessageList
              items={list.data?.items}
              loading={list.isLoading}
              error={list.error}
              onRetry={() => list.refetch()}
              activeId={openId}
              onOpen={open}
              selected={selected}
              onSelectedChange={setSelected}
              filtered={tab !== 'ALL' || !!q}
            />
          </div>
          {list.data && <Pagination className="border-t border-line px-4 pb-3" page={page} pageSize={PAGE_SIZE} total={list.data.total} onPage={setPage} />}
        </Card>

        <Card padded={false} className={cn('min-h-[420px] min-w-0 overflow-hidden lg:sticky lg:top-20 lg:max-h-[calc(100vh-7rem)]', !openId && 'hidden lg:block')}>
          <MessageDetail id={openId} onBack={() => open(null)} onDeleted={() => open(null)} />
        </Card>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete ${selected.size} message${selected.size === 1 ? '' : 's'}?`}
        description="Selected messages will be permanently deleted. Export them first if you need a copy."
        confirmLabel="Delete"
        onConfirm={() =>
          remove.mutateAsync(ids).then(
            (n) => {
              toast.success(`${n} message${n === 1 ? '' : 's'} deleted`)
              if (openId && selected.has(openId)) open(null)
              setSelected(new Set())
              setConfirmDelete(false)
            },
            (e) => toast.fromError(e, 'Some messages were not deleted'),
          )
        }
      />
    </div>
  )
}
