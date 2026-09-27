import { useState, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import type { UseQueryResult } from '@tanstack/react-query'
import type { ZodType } from 'zod'
import { useCan } from '../../lib/auth'
import type { AdminMeta } from '../../lib/types'
import { Button, Segmented } from '../ui'
import { useEntryMutations, useTrashedEntries, type EntrySource } from './api'
import { EntryDrawer, type EntryForm } from './EntryDrawer'
import { EntryList, TrashNote } from './EntryList'

export interface EntryManagerProps<T extends AdminMeta, D> {
  src: EntrySource
  /** Live (non-trashed) list, from the shared query hooks. */
  live: UseQueryResult<T[]>
  noun: string
  plural: string
  icon: ReactNode
  schema: ZodType
  blank: D
  heading: (d: D) => string
  renderRow: (item: T) => ReactNode
  renderLeading?: (item: T) => ReactNode
  renderFields: (form: EntryForm<D>) => ReactNode
  emptyDescription?: ReactNode
}

/** List + drawer editor for one draft/publish collection. */
export function EntryManager<T extends AdminMeta, D>(p: EntryManagerProps<T, D>) {
  const can = useCan()
  const [view, setView] = useState<'live' | 'trash'>('live')
  const [open, setOpen] = useState(false)
  const [session, setSession] = useState(0)
  const [selected, setSelected] = useState<T | null>(null)
  const trash = useTrashedEntries<T>(p.src)
  const mutations = useEntryMutations<T>(p.src)
  const canWrite = can('content:write')

  const openEntry = (e: T | null) => {
    setSelected(e)
    setSession((n) => n + 1)
    setOpen(true)
  }

  const newButton = (
    <Button
      variant="primary"
      size="sm"
      icon={<Plus className="h-4 w-4" />}
      onClick={() => openEntry(null)}
      disabled={!canWrite}
      title={canWrite ? undefined : 'You do not have permission to create content'}
    >
      New {p.noun}
    </Button>
  )
  const trashCount = trash.data?.length ?? 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          size="sm"
          aria-label={`Show ${p.plural}`}
          value={view}
          onChange={setView}
          options={[
            { value: 'live', label: `${cap(p.plural)}${p.live.data ? ` (${p.live.data.length})` : ''}` },
            { value: 'trash', label: `Trash${trash.data ? ` (${trashCount})` : ''}` },
          ]}
        />
        {newButton}
      </div>

      {view === 'live' ? (
        <>
          <EntryList
            query={p.live}
            mutations={mutations}
            renderRow={p.renderRow}
            renderLeading={p.renderLeading}
            onOpen={openEntry}
            sortable={canWrite}
            label={p.plural}
            empty={{ icon: p.icon, title: `No ${p.plural} yet`, description: p.emptyDescription, action: canWrite ? newButton : undefined }}
          />
          {(p.live.data?.length ?? 0) > 1 && canWrite && (
            <p className="text-xs text-dim">Drag the handle (or focus it and use Space + arrow keys) to change the order shown on the site.</p>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <TrashNote count={trashCount} />
          <EntryList
            query={trash}
            mutations={mutations}
            renderRow={p.renderRow}
            renderLeading={p.renderLeading}
            onOpen={openEntry}
            sortable={false}
            label={`trashed ${p.plural}`}
            empty={{ icon: p.icon, title: 'Trash is empty' }}
          />
        </div>
      )}

      <EntryDrawer<T, D>
        open={open}
        session={session}
        onClose={() => setOpen(false)}
        entry={selected}
        noun={p.noun}
        schema={p.schema}
        blank={p.blank}
        mutations={mutations}
        heading={p.heading}
        renderFields={p.renderFields}
      />
    </div>
  )
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
