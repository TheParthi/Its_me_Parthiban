import { useState } from 'react'
import { History } from 'lucide-react'
import { VersionHistory } from '../versions/VersionHistory'
import { Button, ConfirmDialog, PublishBar } from '../ui'
import type { DocEditor } from './useDocEditor'

/** Header button that opens the version history drawer. */
export function HistoryButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="sm" variant="secondary" onClick={onClick} icon={<History className="h-3.5 w-3.5" />}>
      Version history
    </Button>
  )
}

/**
 * Sticky Save draft / Publish / Discard bar for a document editor, with the
 * discard confirmation and the version history drawer.
 */
export function DocPublishControls<T>({
  editor,
  entityType,
  entityId,
  historyOpen,
  onHistoryClose,
  label,
}: {
  editor: DocEditor<T>
  entityType: string
  entityId: string
  historyOpen: boolean
  onHistoryClose: () => void
  label: string
}) {
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const d = editor.doc.data
  const noPerm = 'You do not have permission to do this'

  return (
    <>
      <PublishBar
        dirty={editor.form.dirty}
        hasUnpublishedChanges={d?.hasUnpublishedChanges}
        publishedAt={d?.publishedAt}
        onSaveDraft={() => void editor.saveDraft()}
        onPublish={() => void editor.publish()}
        onDiscard={editor.canDiscard ? () => setConfirmDiscard(true) : undefined}
        saving={editor.saving}
        publishing={editor.publishing}
        discarding={editor.discarding}
        canSave={editor.canSave}
        canPublish={editor.canPublish && (editor.canSave || !editor.form.dirty)}
        extra={
          !editor.canSave ? (
            <span className="text-xs text-muted" title={noPerm}>
              Read-only
            </span>
          ) : undefined
        }
      />
      <ConfirmDialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={async () => {
          await editor.discard()
          setConfirmDiscard(false)
        }}
        title="Discard changes?"
        description={
          d?.published
            ? `Unsaved edits and the saved ${label} draft are replaced with the published version. This cannot be undone.`
            : 'Nothing has been published yet, so only your unsaved edits are discarded.'
        }
        confirmLabel="Discard changes"
      />
      <VersionHistory open={historyOpen} onClose={onHistoryClose} entityType={entityType} entityId={entityId} title={`${label} history`} onRestored={() => void editor.reload()} />
    </>
  )
}
