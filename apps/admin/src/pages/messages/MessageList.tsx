import { Inbox } from 'lucide-react'
import type { ContactMessage } from '../../lib/types'
import { cn } from '../../lib/format'
import { Checkbox, EmptyState, ErrorState, SkeletonRows, StatusBadge } from '../../components/ui'
import { When } from '../../components/admin/shared'

interface Props {
  items: ContactMessage[] | undefined
  loading: boolean
  error: unknown
  onRetry: () => void
  activeId: string | null
  onOpen: (id: string) => void
  selected: Set<string>
  onSelectedChange: (s: Set<string>) => void
  filtered: boolean
}

export function MessageList({ items, loading, error, onRetry, activeId, onOpen, selected, onSelectedChange, filtered }: Props) {
  if (error) return <ErrorState error={error} onRetry={onRetry} title="Could not load messages" />
  if (loading || !items) return <SkeletonRows rows={7} className="p-3" />
  if (!items.length)
    return (
      <EmptyState
        className="m-3"
        icon={<Inbox className="h-5 w-5" />}
        title={filtered ? 'No messages match' : 'No messages yet'}
        description={filtered ? 'Try another tab or search.' : 'Messages sent through the contact form on your portfolio appear here.'}
      />
    )

  const ids = items.map((m) => m.id)
  const all = ids.every((id) => selected.has(id))
  const some = ids.some((id) => selected.has(id))
  const toggle = (id: string) => {
    const s = new Set(selected)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    onSelectedChange(s)
  }

  return (
    <div>
      <div className="flex items-center gap-3 border-b border-line px-4 py-2">
        <Checkbox
          checked={all}
          indeterminate={!all && some}
          onChange={() => {
            const s = new Set(selected)
            if (all) ids.forEach((id) => s.delete(id))
            else ids.forEach((id) => s.add(id))
            onSelectedChange(s)
          }}
          aria-label="Select all messages on this page"
        />
        <span className="mono-meta">{selected.size ? `${selected.size} selected` : 'Select'}</span>
      </div>
      <ul role="list" aria-label="Messages">
        {items.map((m) => {
          const unread = m.status === 'NEW'
          const active = activeId === m.id
          return (
            <li key={m.id} className={cn('flex gap-3 border-b border-line px-4 py-3 transition-colors last:border-b-0', active ? 'bg-accent/[0.08]' : 'hover:bg-white/[0.025]')}>
              <span className="pt-0.5">
                <Checkbox checked={selected.has(m.id)} onChange={() => toggle(m.id)} aria-label={`Select message from ${m.name}`} />
              </span>
              <button type="button" onClick={() => onOpen(m.id)} className="min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-accent-2" aria-current={active || undefined}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className={cn('flex min-w-0 items-center gap-2 truncate text-[13px]', unread ? 'font-semibold text-fg' : 'text-[#d5d9e1]')}>
                    {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-cyan-400" aria-label="Unread" />}
                    <span className="truncate">{m.name}</span>
                  </span>
                  <When iso={m.createdAt} className="shrink-0 text-[11px] text-dim" />
                </div>
                <p className={cn('mt-0.5 truncate text-[13px]', unread ? 'text-fg' : 'text-muted')}>{m.subject}</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-xs text-dim">{m.message.replace(/\s+/g, ' ')}</p>
                  {m.status !== 'NEW' && <StatusBadge status={m.status} />}
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
