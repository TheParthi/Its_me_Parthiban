import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  Briefcase,
  CheckCheck,
  FolderKanban,
  Image,
  Inbox,
  LoaderCircle,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Upload,
  UserRound,
} from 'lucide-react'
import { get, post } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { cn, fmtRelative } from '../../lib/format'
import { useDebounced } from '../../lib/forms'
import { normalizeSearch } from '../../lib/normalize'
import { qk } from '../../lib/queries'
import type { Notification, SearchGroup, SearchHit } from '../../lib/types'
import { Button, Menu, type MenuItem } from '../ui'

// ---------------------------------------------------------------------------
// Global search (⌘K)
// ---------------------------------------------------------------------------

const GROUP_LABEL: Record<SearchGroup, string> = {
  projects: 'Projects',
  skills: 'Skills',
  experience: 'Experience',
  messages: 'Messages',
  media: 'Media',
  users: 'Users',
}

const GROUP_ICON: Record<SearchGroup, typeof FolderKanban> = {
  projects: FolderKanban,
  skills: Sparkles,
  experience: Briefcase,
  messages: Inbox,
  media: Image,
  users: UserRound,
}

export function hitHref(h: SearchHit) {
  switch (h.group) {
    case 'projects':
      return `/projects/${h.id}`
    case 'skills':
      return `/skills?edit=${encodeURIComponent(h.id)}`
    case 'experience':
      return `/experience?edit=${encodeURIComponent(h.id)}`
    case 'messages':
      return `/messages?id=${encodeURIComponent(h.id)}`
    case 'media':
      return `/media?id=${encodeURIComponent(h.id)}`
    case 'users':
      return `/users?focus=${encodeURIComponent(h.id)}`
  }
}

export function GlobalSearch() {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const dq = useDebounced(q.trim(), 250)
  const navigate = useNavigate()

  const res = useQuery({
    queryKey: ['search', dq],
    enabled: dq.length >= 2,
    queryFn: async ({ signal }) => normalizeSearch(await get<unknown>('/admin/search', { q: dq }, signal)),
    staleTime: 30_000,
  })
  const hits = useMemo(() => res.data ?? [], [res.data])

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        input.current?.focus()
        input.current?.select()
        setOpen(true)
      }
    }
    const onDoc = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDoc)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDoc)
    }
  }, [])

  useEffect(() => setActive(0), [dq])

  const go = (h: SearchHit) => {
    navigate(hitHref(h))
    setOpen(false)
    setQ('')
    input.current?.blur()
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(hits.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Enter' && hits[active]) {
      e.preventDefault()
      go(hits[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
      input.current?.blur()
    }
  }

  const grouped = useMemo(() => {
    const m = new Map<SearchGroup, { hit: SearchHit; index: number }[]>()
    hits.forEach((hit, index) => m.set(hit.group, [...(m.get(hit.group) ?? []), { hit, index }]))
    return [...m.entries()]
  }, [hits])

  const show = open && dq.length >= 2
  const listId = 'global-search-results'

  return (
    <div ref={box} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" aria-hidden />
      <input
        ref={input}
        type="search"
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-activedescendant={show && hits[active] ? `gs-${active}` : undefined}
        aria-label="Search projects, skills, messages, media and users"
        placeholder="Search…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        className="field-control h-9 w-full rounded-lg border border-line bg-white/[0.03] pl-9 pr-14 text-sm text-fg placeholder:text-dim focus:border-accent/60 focus:bg-[#0f121a] focus:ring-2 focus:ring-accent/20"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line-2 px-1.5 font-mono text-[10px] text-dim sm:block">⌘K</kbd>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 top-full z-[60] mt-1.5 max-h-[60vh] overflow-y-auto rounded-xl border border-line-2 bg-[#171b26] p-1.5 shadow-2xl shadow-black/50 scroll-thin"
          >
            <ul id={listId} role="listbox" aria-label="Search results">
              {res.isFetching && !hits.length ? (
                <li className="flex items-center gap-2 px-3 py-3 text-[13px] text-muted">
                  <LoaderCircle className="h-4 w-4 animate-spin" /> Searching…
                </li>
              ) : res.error ? (
                <li className="px-3 py-3 text-[13px] text-rose-300">Search is unavailable right now.</li>
              ) : !hits.length ? (
                <li className="px-3 py-3 text-[13px] text-muted">No results for “{dq}”.</li>
              ) : (
                grouped.map(([g, items]) => {
                  const Icon = GROUP_ICON[g]
                  return (
                    <li key={g} role="presentation">
                      <p className="eyebrow px-2.5 pb-1 pt-2">{GROUP_LABEL[g]}</p>
                      <ul role="presentation">
                        {items.map(({ hit, index }) => (
                          <li
                            key={`${g}-${hit.id}`}
                            id={`gs-${index}`}
                            role="option"
                            aria-selected={index === active}
                            onMouseEnter={() => setActive(index)}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              go(hit)
                            }}
                            className={cn('flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2', index === active ? 'bg-white/[0.07]' : '')}
                          >
                            <Icon className="h-4 w-4 shrink-0 text-muted" />
                            <span className="min-w-0 flex-1 truncate text-[13px] text-fg">{hit.title}</span>
                            {hit.subtitle && <span className="max-w-[40%] truncate font-mono text-[10.5px] text-dim">{hit.subtitle}</span>}
                          </li>
                        ))}
                      </ul>
                    </li>
                  )
                })
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export function NotificationsBell() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const n = useQuery({
    queryKey: qk.notifications,
    queryFn: ({ signal }) => get<{ items: Notification[]; unread: number }>('/admin/notifications', undefined, signal),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  })
  const markRead = useMutation({
    mutationFn: (id?: string) => post(id ? `/admin/notifications/${id}/read` : '/admin/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications }),
  })
  const unread = n.data?.unread ?? 0
  const items = n.data?.items ?? []

  const header = (
    <div className="flex items-center justify-between border-b border-line px-2.5 pb-2 pt-1.5">
      <span className="text-[13px] font-semibold text-fg">Notifications</span>
      {unread > 0 && (
        <button className="inline-flex items-center gap-1 text-xs text-accent-2 hover:underline" onClick={() => markRead.mutate(undefined)}>
          <CheckCheck className="h-3.5 w-3.5" /> Mark all read
        </button>
      )}
    </div>
  )

  const menuItems: MenuItem[] = items.length
    ? items.slice(0, 12).map((x) => ({
        icon: x.type === 'security' ? <ShieldAlert className="h-4 w-4 text-rose-300" /> : x.type === 'message' ? <Inbox className="h-4 w-4 text-cyan-300" /> : <Bell className="h-4 w-4" />,
        label: (
          <span className="block">
            <span className={cn('block text-[13px]', x.read ? 'text-muted' : 'font-medium text-fg')}>
              {!x.read && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent-2 align-middle" aria-label="unread" />}
              {x.title}
            </span>
            {x.body && <span className="mt-0.5 line-clamp-2 block text-xs text-muted">{x.body}</span>}
            <span className="mt-0.5 block font-mono text-[10.5px] text-dim">{fmtRelative(x.createdAt)}</span>
          </span>
        ),
        onSelect: () => {
          if (!x.read) markRead.mutate(x.id)
          if (x.link) navigate(x.link.replace(/^\/admin/, '') || '/')
        },
      }))
    : [{ label: <span className="text-muted">{n.error ? 'Could not load notifications' : 'You are all caught up'}</span>, disabled: true }]

  return (
    <Menu
      width="w-[22rem]"
      label="Notifications"
      header={header}
      items={menuItems}
      trigger={(p) => (
        <Button {...p} variant="ghost" size="icon" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 font-mono text-[9.5px] font-semibold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      )}
    />
  )
}

// ---------------------------------------------------------------------------
// Website status
// ---------------------------------------------------------------------------

export function HealthPill() {
  const h = useQuery({
    queryKey: qk.health,
    queryFn: async () => {
      const r = await fetch('/api/health', { headers: { Accept: 'application/json' } }).catch(() => null)
      if (!r) return { status: 'down' as const }
      const b = (await r.json().catch(() => ({}))) as { status?: string }
      return { status: r.ok && b.status === 'ok' ? ('ok' as const) : ('degraded' as const) }
    },
    refetchInterval: 60_000,
    retry: false,
  })
  const s = h.data?.status ?? (h.isLoading ? 'checking' : 'down')
  const label = { ok: 'Operational', degraded: 'Degraded', down: 'Unreachable', checking: 'Checking' }[s]
  const tone = {
    ok: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20',
    degraded: 'text-amber-300 bg-amber-400/10 border-amber-400/20',
    down: 'text-rose-300 bg-rose-400/10 border-rose-400/20',
    checking: 'text-muted bg-white/5 border-line',
  }[s]
  return (
    <span className={cn('hidden h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium md:inline-flex', tone)} role="status" title="API and database health">
      <span className={cn('h-1.5 w-1.5 rounded-full bg-current', s === 'ok' && 'shadow-[0_0_8px_currentColor]')} aria-hidden />
      <span className="sr-only">Website status:</span>
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Quick create
// ---------------------------------------------------------------------------

export function QuickCreate() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const items: MenuItem[] = [
    can('content:write') && { label: 'New project', icon: <FolderKanban className="h-4 w-4" />, onSelect: () => navigate('/projects/new') },
    can('media:write') && { label: 'Upload media', icon: <Upload className="h-4 w-4" />, onSelect: () => navigate('/media?upload=1') },
    can('content:write') && { label: 'New skill', icon: <Sparkles className="h-4 w-4" />, onSelect: () => navigate('/skills?new=1') },
    can('content:write') && { label: 'New experience', icon: <Briefcase className="h-4 w-4" />, onSelect: () => navigate('/experience?new=1') },
  ].filter(Boolean) as MenuItem[]
  if (!items.length) return null
  return (
    <Menu
      label="Create"
      items={items}
      width="w-48"
      trigger={(p) => (
        <Button {...p} variant="primary" size="sm" icon={<Plus className="h-4 w-4" />} aria-label="Create new">
          <span className="hidden sm:inline">New</span>
        </Button>
      )}
    />
  )
}
