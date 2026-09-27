import { useState } from 'react'
import { Archive, CalendarClock, ExternalLink, EyeOff, History, Send, XCircle } from 'lucide-react'
import type { ProjectAdmin } from '@pg/shared'
import { Button, Callout, Card, CardHeader, ConfirmDialog, Input, KeyValue, PublishStateBadge } from '../../../components/ui'
import { fmtDateTime, fmtRelative } from '../../../lib/format'

export interface PublishingTabProps {
  project: ProjectAdmin
  valid: boolean
  canPublish: boolean
  busy: 'publish' | 'schedule' | 'unpublish' | 'archive' | null
  onPublish: (at?: string) => Promise<unknown>
  onUnpublish: () => Promise<unknown>
  onArchive: () => Promise<unknown>
  onPreview: () => void
  previewPending: boolean
  onHistory: () => void
}

/** datetime-local value for "now + 1 hour", rounded to the minute. */
function defaultWhen() {
  const d = new Date(Date.now() + 3600_000)
  d.setSeconds(0, 0)
  const off = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - off).toISOString().slice(0, 16)
}

export function PublishingTab({ project: p, valid, canPublish, busy, onPublish, onUnpublish, onArchive, onPreview, previewPending, onHistory }: PublishingTabProps) {
  const [when, setWhen] = useState(defaultWhen)
  const [confirm, setConfirm] = useState<'unpublish' | 'archive' | 'cancel' | null>(null)
  const whenDate = when ? new Date(when) : null
  const whenErr = !whenDate || Number.isNaN(whenDate.getTime()) ? 'Pick a date and time' : whenDate.getTime() <= Date.now() ? 'Pick a time in the future' : null
  const noPerm = canPublish ? undefined : 'You do not have permission to publish'
  const blocked = !valid ? 'Fix the validation errors first' : noPerm
  const published = p.status === 'PUBLISHED'
  const trashed = !!p.deletedAt

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-5">
        <Card>
          <CardHeader title="Status" actions={<PublishStateBadge status={p.status} hasUnpublishedChanges={p.hasUnpublishedChanges} publishAt={p.publishAt} />} />
          <KeyValue
            items={[
              ['Status', p.status.toLowerCase()],
              ['Published', p.publishedAt ? `${fmtDateTime(p.publishedAt)} (${fmtRelative(p.publishedAt)})` : 'Never'],
              ['Scheduled', p.publishAt ? fmtDateTime(p.publishAt) : '—'],
              ['Draft', p.hasUnpublishedChanges ? 'Has changes not yet published' : 'Matches the live version'],
              ['Last saved', fmtDateTime(p.updatedAt)],
            ]}
          />
          {trashed && (
            <Callout tone="warning" className="mt-4">
              This project is in the trash. Restore it from the projects list before publishing.
            </Callout>
          )}
          {p.status === 'ARCHIVED' && !trashed && (
            <Callout className="mt-4">Archived projects are hidden from the portfolio. Publishing makes it live again.</Callout>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={() => onPublish()}
              loading={busy === 'publish'}
              disabled={!!blocked || trashed || (published && !p.hasUnpublishedChanges)}
              title={blocked}
              icon={<Send className="h-4 w-4" />}
            >
              {published ? 'Publish changes now' : 'Publish now'}
            </Button>
            {published && (
              <Button variant="secondary" onClick={() => setConfirm('unpublish')} loading={busy === 'unpublish'} disabled={!canPublish} title={noPerm} icon={<EyeOff className="h-4 w-4" />}>
                Unpublish
              </Button>
            )}
            {p.status !== 'ARCHIVED' && (
              <Button variant="ghost" onClick={() => setConfirm('archive')} loading={busy === 'archive'} disabled={!canPublish || trashed} title={noPerm} icon={<Archive className="h-4 w-4" />}>
                Archive
              </Button>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Schedule" description="Publish the saved draft automatically at a later time. The schedule is checked about once a minute." />
          {p.publishAt ? (
            <div className="space-y-3">
              <Callout tone="info" icon={<CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />} title={`Scheduled for ${fmtDateTime(p.publishAt)}`}>
                {published
                  ? 'The current live version stays up until then. To cancel, publish now instead, or unpublish (takes the live version offline).'
                  : 'To cancel, clear the schedule — the project stays a draft.'}
              </Callout>
              <div className="flex flex-wrap gap-2">
                {published ? (
                  <Button size="sm" onClick={() => onPublish()} disabled={!!blocked} title={blocked} loading={busy === 'publish'} icon={<Send className="h-3.5 w-3.5" />}>
                    Publish now instead
                  </Button>
                ) : (
                  <Button size="sm" variant="danger" onClick={() => setConfirm('cancel')} disabled={!canPublish} title={noPerm} icon={<XCircle className="h-3.5 w-3.5" />}>
                    Cancel schedule
                  </Button>
                )}
              </div>
            </div>
          ) : null}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <Input
              label={p.publishAt ? 'Reschedule to' : 'Publish at'}
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              error={when ? whenErr : null}
              containerClassName="sm:w-64"
              hint={`Your local time (${Intl.DateTimeFormat().resolvedOptions().timeZone})`}
            />
            <Button
              onClick={() => whenDate && onPublish(whenDate.toISOString())}
              disabled={!!blocked || !!whenErr || trashed}
              title={blocked ?? whenErr ?? undefined}
              loading={busy === 'schedule'}
              icon={<CalendarClock className="h-4 w-4" />}
              className="sm:mb-[22px]"
            >
              {p.publishAt ? 'Reschedule' : 'Schedule'}
            </Button>
          </div>
        </Card>
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader title="Preview" description="Opens the portfolio rendered from saved drafts in a new tab (link valid ~15 min)." />
          <Button onClick={onPreview} loading={previewPending} icon={<ExternalLink className="h-4 w-4" />} className="w-full">
            Open draft preview
          </Button>
        </Card>
        <Card>
          <CardHeader title="Version history" description="Every publish is kept. Restoring copies a version into the draft." />
          <Button onClick={onHistory} icon={<History className="h-4 w-4" />} className="w-full">
            View versions
          </Button>
        </Card>
      </div>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        tone={confirm === 'archive' || confirm === 'unpublish' ? 'primary' : 'danger'}
        title={confirm === 'archive' ? 'Archive this project?' : confirm === 'cancel' ? 'Cancel the schedule?' : 'Unpublish this project?'}
        description={
          confirm === 'archive'
            ? 'It is hidden from the portfolio and any schedule is cancelled. Publish again to bring it back.'
            : confirm === 'cancel'
              ? 'The scheduled publish is removed and the project stays a draft.'
              : 'It is removed from the public site and any schedule is cancelled. Your draft is kept.'
        }
        confirmLabel={confirm === 'archive' ? 'Archive' : confirm === 'cancel' ? 'Cancel schedule' : 'Unpublish'}
        onConfirm={async () => {
          try {
            await (confirm === 'archive' ? onArchive() : onUnpublish())
            setConfirm(null)
          } catch {
            /* toast shown by the caller */
          }
        }}
      />
    </div>
  )
}
