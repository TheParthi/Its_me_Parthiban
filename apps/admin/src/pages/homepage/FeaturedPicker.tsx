import { useMemo, useState } from 'react'
import { Plus, Star, TriangleAlert, X } from 'lucide-react'
import type { ProjectAdmin } from '@pg/shared'
import { useProjects } from '../../lib/queries'
import { Badge, Button, Card, CardHeader, DragHandle, ErrorState, Select, SkeletonRows, SortableList } from '../../components/ui'

const MAX = 8

/** Ordered featured-project list; empty = the projects flagged "featured". */
export function FeaturedPicker({ value, onChange, error, disabled }: { value: string[]; onChange: (ids: string[]) => void; error?: string; disabled?: boolean }) {
  const projects = useProjects()
  const [adding, setAdding] = useState('')
  const all = useMemo(() => (projects.data ?? []).filter((p) => !p.deletedAt), [projects.data])
  const published = all.filter((p) => p.status === 'PUBLISHED')
  const byId = new Map(all.map((p) => [p.id, p]))
  const available = published.filter((p) => !value.includes(p.id))
  const flagged = published.filter((p) => p.featured)

  const add = (id: string) => {
    if (!id || value.includes(id) || value.length >= MAX) return
    onChange([...value, id])
    setAdding('')
  }

  return (
    <Card>
      <CardHeader
        title="Featured projects"
        description={`Pick up to ${MAX} published projects in the order they should appear. Leave empty to use the projects marked “featured”.`}
        actions={<span className="font-mono text-xs text-dim">{value.length}/{MAX}</span>}
      />
      {projects.error ? (
        <ErrorState error={projects.error} onRetry={() => projects.refetch()} title="Could not load projects" />
      ) : projects.isLoading ? (
        <SkeletonRows rows={3} />
      ) : (
        <div className="space-y-3">
          {value.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line-2 px-3 py-4 text-[13px] text-muted">
              <p className="flex items-center gap-1.5 text-fg">
                <Star className="h-3.5 w-3.5 text-amber-300" aria-hidden /> Using projects marked featured
              </p>
              <p className="mt-1 text-xs">{flagged.length ? flagged.map((p) => p.title).join(' · ') : 'No published project is marked featured yet.'}</p>
            </div>
          ) : (
            <SortableList
              items={value}
              getId={(id) => id}
              onReorder={(next) => onChange(next)}
              disabled={disabled}
              className="space-y-1.5"
              renderItem={(id, handle, { index }) => <Row project={byId.get(id)} id={id} index={index} handle={handle} disabled={disabled} onRemove={() => onChange(value.filter((v) => v !== id))} />}
            />
          )}
          {error && (
            <p className="text-xs text-rose-300" role="alert">
              {error}
            </p>
          )}
          <div className="flex items-end gap-2">
            <Select
              aria-label="Add a project"
              value={adding}
              onChange={setAdding}
              containerClassName="flex-1"
              disabled={disabled || value.length >= MAX || !available.length}
              placeholder={value.length >= MAX ? `Maximum of ${MAX} reached` : available.length ? 'Choose a published project…' : 'No more published projects'}
              options={available.map((p) => ({ value: p.id, label: p.title }))}
            />
            <Button size="md" variant="secondary" icon={<Plus className="h-4 w-4" />} disabled={!adding || disabled} onClick={() => add(adding)}>
              Add
            </Button>
          </div>
          {value.length > 0 && (
            <Button size="xs" variant="ghost" disabled={disabled} onClick={() => onChange([])}>
              Clear — use projects marked featured
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}

function Row({
  project,
  id,
  index,
  handle,
  disabled,
  onRemove,
}: {
  project: ProjectAdmin | undefined
  id: string
  index: number
  handle: Parameters<typeof DragHandle>[0]['handle']
  disabled?: boolean
  onRemove: () => void
}) {
  const unpublished = project && project.status !== 'PUBLISHED'
  return (
    <div className="flex items-center gap-2 rounded-lg border border-line bg-white/[0.02] px-2 py-1.5">
      <DragHandle handle={handle} />
      <span className="font-mono text-[10.5px] text-dim">{index + 1}</span>
      <span className="min-w-0 flex-1 truncate text-[13px] text-fg">{project?.title ?? <span className="text-muted">Missing project ({id.slice(0, 8)}…)</span>}</span>
      {(!project || unpublished) && (
        <Badge tone="amber">
          <TriangleAlert className="h-3 w-3" aria-hidden /> {project ? 'Not published' : 'Deleted'}
        </Badge>
      )}
      <Button size="icon-sm" variant="ghost" aria-label={`Remove ${project?.title ?? 'project'}`} disabled={disabled} onClick={onRemove}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
