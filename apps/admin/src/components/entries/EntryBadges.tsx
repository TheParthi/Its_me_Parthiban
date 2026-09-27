import { EyeOff, Star, Trash2 } from 'lucide-react'
import { Badge } from '../ui'
import type { AdminMeta } from '../../lib/types'

type Meta = Pick<AdminMeta, 'status' | 'hasUnpublishedChanges' | 'deletedAt'> & { visible?: boolean; featured?: boolean }

/**
 * Publish state for list rows. Unpublished entries say plainly that they are
 * not public; published ones flag pending draft edits.
 */
export function EntryBadges({ entry, compact }: { entry: Meta; compact?: boolean }) {
  const published = entry.status === 'PUBLISHED'
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {entry.deletedAt ? (
        <Badge tone="rose">
          <Trash2 className="h-3 w-3" aria-hidden /> In trash
        </Badge>
      ) : published ? (
        <Badge tone="emerald" dot>
          Published
        </Badge>
      ) : (
        <Badge tone="amber" dot>
          {compact ? 'Draft' : 'Draft — not shown publicly'}
        </Badge>
      )}
      {published && entry.hasUnpublishedChanges && !entry.deletedAt && (
        <Badge tone="sky" className="normal-case">
          Unpublished changes
        </Badge>
      )}
      {entry.featured && (
        <Badge tone="violet">
          <Star className="h-3 w-3" aria-hidden /> Featured
        </Badge>
      )}
      {entry.visible === false && (
        <Badge tone="gray">
          <EyeOff className="h-3 w-3" aria-hidden /> Hidden
        </Badge>
      )}
    </span>
  )
}
