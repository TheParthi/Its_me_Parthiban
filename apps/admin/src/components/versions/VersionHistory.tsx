import { useState } from 'react'
import { useCan } from '../../lib/auth'
import { fmtDateTime, fmtRelative } from '../../lib/format'
import { useRestoreVersion, useVersion, useVersions } from '../../lib/queries'
import type { VersionEntry } from '../../lib/types'
import { Badge, Button, ConfirmDialog, Drawer, EmptyState, ErrorState, SkeletonRows, useToast } from '../ui'

function authorName(a: VersionEntry['author']) {
  if (!a) return 'System'
  if (typeof a === 'string') return a
  return a.name || a.email || 'Unknown'
}

export interface VersionHistoryProps {
  open: boolean
  onClose: () => void
  entityType: string
  entityId: string | undefined
  title?: string
  /** Called after a restore so the editor can reload its draft. */
  onRestored?: () => void
}

/**
 * Published versions of an entity. Viewing shows the stored snapshot;
 * restoring copies it into the draft (publish afterwards).
 */
export function VersionHistory({ open, onClose, entityType, entityId, title = 'Version history', onRestored }: VersionHistoryProps) {
  const list = useVersions(entityType, entityId, open)
  const [viewing, setViewing] = useState<string | null>(null)
  const [restoring, setRestoring] = useState<VersionEntry | null>(null)
  const snap = useVersion(viewing)
  const restore = useRestoreVersion()
  const toast = useToast()
  const can = useCan()

  return (
    <Drawer open={open} onClose={onClose} title={title} description="Each publish stores a version. Restoring copies it into the draft — publish afterwards to make it live." width="xl">
      {list.error ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : list.isLoading ? (
        <SkeletonRows rows={5} />
      ) : !list.data?.length ? (
        <EmptyState title="No versions yet" description="A version is saved every time this is published." compact />
      ) : (
        <ol className="space-y-2">
          {list.data.map((v) => (
            <li key={v.id} className="rounded-lg border border-line bg-card">
              <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-fg">v{v.version}</span>
                    <Badge tone={v.action === 'publish' ? 'emerald' : v.action === 'restore' ? 'violet' : 'neutral'}>{v.action}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted" title={fmtDateTime(v.createdAt)}>
                    {authorName(v.author)} · {fmtRelative(v.createdAt)}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Button size="xs" variant="ghost" onClick={() => setViewing(viewing === v.id ? null : v.id)} aria-expanded={viewing === v.id}>
                    {viewing === v.id ? 'Hide' : 'View'}
                  </Button>
                  {can('content:publish') && (
                    <Button size="xs" variant="secondary" onClick={() => setRestoring(v)}>
                      Restore
                    </Button>
                  )}
                </div>
              </div>
              {viewing === v.id && (
                <div className="border-t border-line p-3">
                  {snap.isLoading ? (
                    <SkeletonRows rows={2} />
                  ) : snap.error ? (
                    <ErrorState error={snap.error} />
                  ) : (
                    <pre className="scroll-thin max-h-80 overflow-auto rounded-md bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-[#c9ced8]">
                      {JSON.stringify(snap.data?.snapshot ?? snap.data, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
      <ConfirmDialog
        open={!!restoring}
        onClose={() => setRestoring(null)}
        tone="primary"
        title={`Restore v${restoring?.version}?`}
        description="The current draft will be replaced with this version. The live site does not change until you publish."
        confirmLabel="Restore to draft"
        typeToConfirm="RESTORE"
        onConfirm={async () => {
          if (!restoring) return
          try {
            await restore.mutateAsync(restoring.id)
            toast.success(`Version ${restoring.version} restored to draft`, 'Review it, then publish.')
            setRestoring(null)
            onRestored?.()
          } catch (err) {
            toast.fromError(err, 'Restore failed')
          }
        }}
      />
    </Drawer>
  )
}
