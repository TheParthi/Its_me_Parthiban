import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, ExternalLink, History, Save } from 'lucide-react'
import { ApiError } from '../../lib/api'
import { useCan } from '../../lib/auth'
import { fmtDateTime } from '../../lib/format'
import { useProjects } from '../../lib/queries'
import { usePreviewWebsite } from '../../components/preview/PreviewFrame'
import { VersionHistory } from '../../components/versions/VersionHistory'
import { Button, Callout, EmptyState, ErrorState, PageHeader, PageSkeleton, PublishBar, PublishStateBadge, Tabs, buttonClass, useToast } from '../../components/ui'
import { LeaveGuard, SaveIndicator } from './EditorChrome'
import { useProjectActions } from './projectApi'
import { TAB_LABELS, tabOf, tabsWithErrors, type TabKey } from './projectModel'
import { useProjectDraft } from './useProjectDraft'
import { DescriptionTab } from './tabs/DescriptionTab'
import { DetailsTab } from './tabs/DetailsTab'
import { GeneralTab } from './tabs/GeneralTab'
import { MediaTab } from './tabs/MediaTab'
import { PublishingTab, type PublishingTabProps } from './tabs/PublishingTab'
import { SeoTab } from './tabs/SeoTab'
import { TechTab } from './tabs/TechTab'

const TAB_ORDER: TabKey[] = ['general', 'description', 'tech', 'media', 'details', 'seo', 'publishing']

export default function ProjectEditorPage() {
  const { id } = useParams()
  const toast = useToast()
  const can = useCan()
  const canWrite = can('content:write')
  const canPublish = can('content:publish')
  const draft = useProjectDraft(id)
  const actions = useProjectActions()
  const preview = usePreviewWebsite()
  const all = useProjects()
  const [tab, setTab] = useState<TabKey>('general')
  const [history, setHistory] = useState(false)
  const [busy, setBusy] = useState<PublishingTabProps['busy']>(null)

  const { project, value, errors, dirty, valid, state } = draft
  const p = project.data
  const errTabs = useMemo(() => tabsWithErrors(errors), [errors])
  const errorCount = Object.keys(errors).length
  const techSuggestions = useMemo(() => [...new Set((all.data ?? []).flatMap((x) => x.technologies ?? []))].sort(), [all.data])

  if (project.isLoading || (p && !value)) return <PageSkeleton />
  if (project.isError)
    return (
      <div>
        <BackLink />
        {project.error instanceof ApiError && project.error.status === 404 ? (
          <EmptyState title="Project not found" description="It may have been deleted permanently." action={<Link to="/projects" className={buttonClass('primary', 'sm')}>Back to projects</Link>} />
        ) : (
          <ErrorState error={project.error} onRetry={() => project.refetch()} title="Could not load this project" />
        )}
      </div>
    )
  if (!p || !value || !id) return null

  const trashed = !!p.deletedAt
  const readOnly = !canWrite || trashed

  const jumpToErrors = () => {
    const first = Object.keys(errors)[0]
    if (first) setTab(tabOf(first))
  }

  const manualSave = async () => {
    if (!valid) {
      jumpToErrors()
      return toast.error('Fix the highlighted fields', `${errorCount} field${errorCount === 1 ? ' needs' : 's need'} attention.`)
    }
    if (await draft.save()) toast.success('Draft saved')
    else if (draft.saveError) toast.fromError(draft.saveError, 'Could not save')
  }

  const run = async (kind: NonNullable<typeof busy>, fn: () => Promise<unknown>, ok: string, fail: string) => {
    setBusy(kind)
    try {
      await fn()
      toast.success(ok)
    } catch (err) {
      if (draft.applyServerError(err)) jumpToErrors()
      toast.fromError(err, fail)
      throw err
    } finally {
      setBusy(null)
    }
  }

  const publish = (at?: string) =>
    run(
      at ? 'schedule' : 'publish',
      async () => {
        if (!valid) {
          jumpToErrors()
          throw new Error('Fix the validation errors before publishing')
        }
        if (dirty && !(await draft.save())) throw new Error('Could not save the latest edits, so nothing was published')
        await actions.publish.mutateAsync({ id, at })
      },
      at ? `Scheduled for ${fmtDateTime(at)}` : 'Published — live on the portfolio',
      at ? 'Could not schedule' : 'Could not publish',
    ).catch(() => undefined)

  const tabProps = { value, set: draft.set, errors, disabled: readOnly }
  const publishBlocked = !canPublish ? 'You do not have permission to publish' : !valid ? 'Fix the validation errors first' : trashed ? 'Restore from trash first' : undefined

  return (
    <div>
      <LeaveGuard when={dirty} />
      <BackLink />
      <PageHeader
        title={value.title || 'Untitled project'}
        description={<span className="font-mono text-xs">/{value.slug}</span>}
        meta={
          <>
            <PublishStateBadge status={p.status} hasUnpublishedChanges={p.hasUnpublishedChanges} publishAt={p.publishAt} />
            <SaveIndicator state={state} dirty={dirty} savedAt={draft.savedAt} />
          </>
        }
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => setHistory(true)} icon={<History className="h-4 w-4" />}>
              History
            </Button>
            <Button variant="secondary" size="sm" onClick={preview.open} loading={preview.pending} icon={<ExternalLink className="h-4 w-4" />}>
              Preview
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={manualSave}
              disabled={!dirty || readOnly}
              loading={state === 'saving'}
              title={!canWrite ? 'You do not have permission to edit projects' : undefined}
              icon={<Save className="h-4 w-4" />}
            >
              Save
            </Button>
          </>
        }
      />

      {trashed && (
        <Callout tone="warning" className="mb-4" title="This project is in the trash">
          It is read-only. Restore it from the projects list (Trash) to edit or publish.
        </Callout>
      )}
      {!canWrite && !trashed && (
        <Callout className="mb-4">You have read-only access. Editing needs the content:write permission.</Callout>
      )}
      {errorCount > 0 && (dirty || state === 'error') && (
        <Callout tone="danger" className="mb-4" title={`${errorCount} field${errorCount === 1 ? ' needs' : 's need'} attention`}>
          Autosave is paused until they are fixed. Tabs with problems are marked with a red dot.{' '}
          <button type="button" className="underline underline-offset-2" onClick={jumpToErrors}>
            Go to the first one
          </button>
        </Callout>
      )}

      <Tabs
        aria-label="Project sections"
        value={tab}
        onChange={setTab}
        items={TAB_ORDER.map((t) => ({ value: t, label: TAB_LABELS[t], alert: errTabs.has(t) }))}
        className="mb-5"
      />

      <div role="tabpanel" aria-label={TAB_LABELS[tab]}>
        {tab === 'general' && <GeneralTab {...tabProps} />}
        {tab === 'description' && <DescriptionTab {...tabProps} />}
        {tab === 'tech' && <TechTab {...tabProps} suggestions={techSuggestions} />}
        {tab === 'media' && <MediaTab {...tabProps} />}
        {tab === 'details' && <DetailsTab {...tabProps} />}
        {tab === 'seo' && <SeoTab {...tabProps} />}
        {tab === 'publishing' && (
          <PublishingTab
            project={p}
            valid={valid}
            canPublish={canPublish}
            busy={busy}
            onPublish={publish}
            onUnpublish={() => run('unpublish', () => actions.unpublish.mutateAsync(id), 'Unpublished', 'Could not unpublish')}
            onArchive={() => run('archive', () => actions.archive.mutateAsync(id), 'Archived', 'Could not archive')}
            onPreview={preview.open}
            previewPending={preview.pending}
            onHistory={() => setHistory(true)}
          />
        )}
      </div>

      <PublishBar
        dirty={dirty}
        hasUnpublishedChanges={p.hasUnpublishedChanges || p.status !== 'PUBLISHED'}
        publishedAt={p.publishedAt}
        onSaveDraft={manualSave}
        onPublish={() => void publish()}
        saving={state === 'saving'}
        publishing={busy === 'publish'}
        canPublish={!publishBlocked}
        canSave={!readOnly}
        autosave={state === 'invalid' ? 'idle' : state}
        extra={publishBlocked && canPublish ? <span className="hidden text-xs text-amber-300 sm:inline">{publishBlocked}</span> : undefined}
      />

      <VersionHistory
        open={history}
        onClose={() => setHistory(false)}
        entityType="project"
        entityId={id}
        title={`Versions — ${value.title}`}
        onRestored={() => {
          void draft.reload()
          toast.info('Version restored into the draft', 'Review it, then publish to make it live.')
        }}
      />
    </div>
  )
}

function BackLink() {
  return (
    <Link to="/projects" className={buttonClass('ghost', 'sm', '-ml-2 mb-3')}>
      <ArrowLeft className="h-4 w-4" /> Projects
    </Link>
  )
}
