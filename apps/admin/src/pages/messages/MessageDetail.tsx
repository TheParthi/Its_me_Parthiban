import { useState } from 'react'
import { Archive, ArrowLeft, Mail, MailOpen, Reply, ShieldAlert, Trash2 } from 'lucide-react'
import { MESSAGE_STATUS, type MessageStatus } from '@pg/shared'
import { fmtDateTime } from '../../lib/format'
import { Button, Card, ConfirmDialog, EmptyState, ErrorState, KeyValue, Select, Skeleton, StatusBadge, useToast } from '../../components/ui'
import { Gate, usePerm } from '../../components/admin/shared'
import { useMessage, useMessageActions } from './messagesApi'

const STATUS_LABELS: Record<MessageStatus, string> = { NEW: 'New', READ: 'Read', REPLIED: 'Replied', ARCHIVED: 'Archived', SPAM: 'Spam' }

function mailto(email: string, subject: string) {
  const s = /^re:/i.test(subject) ? subject : `Re: ${subject}`
  return `mailto:${encodeURIComponent(email).replace(/%40/g, '@')}?subject=${encodeURIComponent(s)}`
}

export function MessageDetail({ id, onBack, onDeleted }: { id: string | null; onBack: () => void; onDeleted: () => void }) {
  const q = useMessage(id)
  const { setStatus, remove } = useMessageActions()
  const toast = useToast()
  const write = usePerm('messages:write')
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!id)
    return (
      <EmptyState
        className="h-full min-h-[320px] border-none"
        icon={<Mail className="h-5 w-5" />}
        title="Select a message"
        description="Choose a message from the list to read it. Opening a new message marks it as read."
      />
    )

  const back = (
    <Button variant="ghost" size="sm" onClick={onBack} icon={<ArrowLeft className="h-4 w-4" />} className="lg:hidden">
      Back to inbox
    </Button>
  )

  if (q.error) return <div className="p-4">{back}<ErrorState error={q.error} onRetry={() => q.refetch()} title="Could not open this message" className="mt-3" /></div>
  if (!q.data)
    return (
      <div className="space-y-3 p-5" aria-busy="true">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    )

  const m = q.data
  const change = (status: MessageStatus, quiet = false) =>
    setStatus.mutate(
      { ids: [m.id], status },
      {
        onSuccess: () => {
          q.refetch()
          if (!quiet) toast.success(`Marked as ${STATUS_LABELS[status].toLowerCase()}`)
        },
        onError: (e) => toast.fromError(e, 'Could not update the message'),
      },
    )

  return (
    <article className="flex h-full flex-col" aria-label={`Message from ${m.name}`}>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        {back}
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Gate reason={write.reason}>
            <Button size="sm" variant="ghost" disabled={!write.allowed || m.status === 'ARCHIVED'} onClick={() => change('ARCHIVED')} icon={<Archive className="h-4 w-4" />}>
              Archive
            </Button>
          </Gate>
          <Gate reason={write.reason}>
            <Button size="sm" variant="ghost" disabled={!write.allowed || m.status === 'SPAM'} onClick={() => change('SPAM')} icon={<ShieldAlert className="h-4 w-4" />}>
              Spam
            </Button>
          </Gate>
          <Gate reason={write.reason}>
            <Button size="sm" variant="ghost" disabled={!write.allowed || m.status === 'NEW'} onClick={() => change('NEW')} icon={<MailOpen className="h-4 w-4" />}>
              Mark unread
            </Button>
          </Gate>
          <Gate reason={write.reason}>
            <Button size="icon-sm" variant="ghost" disabled={!write.allowed} onClick={() => setConfirmDelete(true)} aria-label="Delete message" title="Delete message">
              <Trash2 className="h-4 w-4 text-rose-300" />
            </Button>
          </Gate>
        </div>
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="min-w-0 break-words text-lg font-semibold text-fg">{m.subject}</h2>
          <StatusBadge status={m.status} />
        </div>
        <KeyValue
          className="mt-4"
          items={[
            ['From', m.name],
            ['Email', <a key="e" href={`mailto:${m.email}`} className="break-all text-violet-300 hover:underline">{m.email}</a>],
            ['Received', fmtDateTime(m.createdAt)],
          ]}
        />
        <Card className="mt-5 bg-black/20" padded>
          {/* Plain text only — the visitor's message is never rendered as HTML. */}
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[#d5d9e1]">{m.message}</p>
        </Card>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <a
            href={mailto(m.email, m.subject)}
            onClick={() => {
              if (write.allowed && m.status !== 'REPLIED') change('REPLIED', true)
            }}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-2"
          >
            <Reply className="h-4 w-4" /> Reply by email
          </a>
          <div className="sm:ml-auto">
          <Gate reason={write.reason}>
            <Select
              label="Status"
              containerClassName="w-full sm:w-44"
              value={m.status}
              disabled={!write.allowed || setStatus.isPending}
              options={MESSAGE_STATUS.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
              onChange={(v) => change(v)}
            />
          </Gate>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">Replying opens your email app; the message is marked as replied.</p>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this message?"
        description={`The message from ${m.name} will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() =>
          remove.mutateAsync([m.id]).then(
            () => {
              toast.success('Message deleted')
              setConfirmDelete(false)
              onDeleted()
            },
            (e) => toast.fromError(e, 'Could not delete the message'),
          )
        }
      />
    </article>
  )
}

export { STATUS_LABELS }
