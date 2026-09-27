import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CircleCheck, CircleX, Clock, LoaderCircle } from 'lucide-react'
import { Badge, Button, Callout, Checkbox, Modal } from '../../components/ui'
import { errorMessage, post } from '../../lib/api'
import { useCan } from '../../lib/auth'
import { cn } from '../../lib/format'
import type { PendingItem } from './usePortfolioData'

type RunState = { state: 'waiting' | 'running' | 'ok' } | { state: 'error'; message: string }

export function PublishAllDialog({ open, onClose, items }: { open: boolean; onClose: () => void; items: PendingItem[] }) {
  const can = useCan()
  const qc = useQueryClient()
  const allowed = (i: PendingItem) => i.perms.every(can)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [run, setRun] = useState<Record<string, RunState> | null>(null)
  const [phase, setPhase] = useState<'review' | 'running' | 'done'>('review')
  // Snapshot of what was sent: refetches after publishing shrink `items`.
  const [ran, setRan] = useState<PendingItem[]>([])

  // Fresh selection each time the dialog opens: edits to live content are
  // pre-selected; first-time publishes of drafts are opt-in.
  useEffect(() => {
    if (!open) return
    setPhase('review')
    setRun(null)
    setSelected(new Set(items.filter((i) => allowed(i) && !i.firstPublish).map((i) => i.key)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const queue = items.filter((i) => selected.has(i.key))
  const shown = phase === 'review' ? items : ran

  const start = async () => {
    const init: Record<string, RunState> = {}
    for (const i of queue) init[i.key] = { state: 'waiting' }
    setRun(init)
    setRan(queue)
    setPhase('running')
    for (const i of queue) {
      setRun((r) => ({ ...r, [i.key]: { state: 'running' } }))
      try {
        await post(i.path, i.path.startsWith('/admin/projects/') ? {} : undefined)
        setRun((r) => ({ ...r, [i.key]: { state: 'ok' } }))
      } catch (err) {
        setRun((r) => ({ ...r, [i.key]: { state: 'error', message: errorMessage(err) } }))
      }
    }
    setPhase('done')
    for (const k of [['document'], ['projects'], ['project'], ['skills'], ['collection'], ['versions']]) qc.invalidateQueries({ queryKey: k })
  }

  const results = run ? Object.values(run) : []
  const ok = results.filter((r) => r.state === 'ok').length
  const failed = results.filter((r) => r.state === 'error').length

  const toggle = (k: string, v: boolean) =>
    setSelected((s) => {
      const n = new Set(s)
      if (v) n.add(k)
      else n.delete(k)
      return n
    })

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      dismissable={phase !== 'running'}
      title={phase === 'review' ? 'Publish everything pending' : phase === 'running' ? 'Publishing…' : 'Publish finished'}
      description={phase === 'review' ? 'The selected items are published one at a time. Visitors see each change as soon as it is published.' : undefined}
      footer={
        phase === 'review' ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={start} disabled={!queue.length}>
              Publish {queue.length} item{queue.length === 1 ? '' : 's'}
            </Button>
          </>
        ) : (
          <Button variant="primary" onClick={onClose} disabled={phase === 'running'}>
            Close
          </Button>
        )
      }
    >
      {phase === 'done' && (
        <Callout tone={failed ? 'warning' : 'success'} className="mb-4" title={failed ? `${ok} published, ${failed} failed` : `All ${ok} items published`}>
          {failed ? 'Failed items keep their draft. Open them to fix the problem and publish again.' : 'The public site is up to date.'}
        </Callout>
      )}
      <ul className="max-h-[55vh] divide-y divide-line overflow-auto rounded-lg border border-line">
        {shown.map((i) => {
          const r = run?.[i.key]
          const denied = !allowed(i)
          return (
            <li key={i.key} className="flex items-start gap-3 px-3 py-2.5">
              <div className="pt-0.5">
                {phase === 'review' ? (
                  <Checkbox checked={selected.has(i.key)} disabled={denied} onChange={(v) => toggle(i.key, v)} aria-label={`Publish ${i.label}`} />
                ) : (
                  <StatusIcon r={r} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn('truncate text-sm text-fg', denied && 'opacity-60')} title={denied ? 'You do not have permission to publish this' : undefined}>
                  {i.label}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted">{i.area}</span>
                  {i.firstPublish && <Badge tone="sky">first publish</Badge>}
                  {denied && <Badge tone="gray">no permission</Badge>}
                </div>
                {r?.state === 'error' && (
                  <p className="mt-1 text-xs text-rose-300" role="alert">
                    {r.message}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </Modal>
  )
}

function StatusIcon({ r }: { r?: RunState }) {
  if (!r || r.state === 'waiting') return <Clock className="h-4 w-4 text-dim" aria-label="Waiting" />
  if (r.state === 'running') return <LoaderCircle className="h-4 w-4 animate-spin text-accent-2" aria-label="Publishing" />
  if (r.state === 'ok') return <CircleCheck className="h-4 w-4 text-emerald-400" aria-label="Published" />
  return <CircleX className="h-4 w-4 text-rose-400" aria-label="Failed" />
}
