import { useState } from 'react'
import { ChevronsDownUp, ChevronsUpDown, History, Plus } from 'lucide-react'
import { homepageSchema, SECTION_TYPES, type HomepageConfig, type SectionConfig } from '@pg/shared'
import { PreviewFrame } from '../../components/preview/PreviewFrame'
import { useSiteDocument } from '../../components/site/useSiteDocument'
import { VersionHistory } from '../../components/versions/VersionHistory'
import { Button, Callout, Card, CardHeader, ConfirmDialog, ErrorState, PageHeader, PageSkeleton, PublishBar, PublishStateBadge, SortableList, Switch } from '../../components/ui'
import { FeaturedPicker } from './FeaturedPicker'
import { SectionCard } from './SectionCard'
import { SECTION_META, newSection } from './sectionMeta'

export default function HomepageBuilderPage() {
  const ed = useSiteDocument<HomepageConfig>('homepage', homepageSchema, 'Homepage')
  const { doc, form } = ed
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [history, setHistory] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  if (doc.error) return (
    <div className="space-y-5">
      <PageHeader title="Homepage Builder" />
      <ErrorState error={doc.error} onRetry={() => doc.refetch()} title="Could not load the homepage" />
    </div>
  )
  if (doc.isLoading || !form.value) return <PageSkeleton />

  const value = form.value
  const sections = value.sections
  const missing = SECTION_TYPES.filter((t) => !sections.some((s) => s.type === t))
  const disabled = !ed.canWrite
  const formError = form.errors._form ?? form.errors.sections

  const setSection = (i: number, key: keyof SectionConfig, v: unknown) => form.set(['sections', i, key], v)
  const toggleExpand = (type: string) =>
    setExpanded((s) => {
      const n = new Set(s)
      if (n.has(type)) n.delete(type)
      else n.add(type)
      return n
    })
  const allOpen = expanded.size === sections.length

  return (
    <div className="space-y-5">
      <PageHeader
        title="Homepage Builder"
        description="Choose which sections appear on the homepage, in what order, and how each one is introduced."
        meta={doc.data && <PublishStateBadge status={doc.data.status} hasUnpublishedChanges={doc.data.hasUnpublishedChanges} />}
        actions={
          <Button variant="secondary" size="sm" icon={<History className="h-4 w-4" />} onClick={() => setHistory(true)}>
            Version history
          </Button>
        }
      />

      {!ed.canWrite && <Callout tone="warning" title="Read-only">You need the site:write permission to change the homepage.</Callout>}
      {ed.issues.length > 0 && (
        <Callout tone="danger" title="The homepage has issues to fix before saving">
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {ed.issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </Callout>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader
              title="Sections"
              description="Drag to reorder. Hidden sections keep their settings."
              actions={
                <Button
                  size="xs"
                  variant="ghost"
                  icon={allOpen ? <ChevronsDownUp className="h-3.5 w-3.5" /> : <ChevronsUpDown className="h-3.5 w-3.5" />}
                  onClick={() => setExpanded(allOpen ? new Set() : new Set(sections.map((s) => s.type)))}
                >
                  {allOpen ? 'Collapse all' : 'Expand all'}
                </Button>
              }
            />
            {formError && (
              <p className="mb-3 text-xs text-rose-300" role="alert">
                {formError}
              </p>
            )}
            <SortableList
              items={sections}
              getId={(s) => s.type}
              disabled={disabled}
              onReorder={(next) => form.set(['sections'], next)}
              className="space-y-2"
              renderItem={(s, handle, { dragging, index }) => (
                <SectionCard
                  section={s}
                  index={index}
                  handle={handle}
                  dragging={dragging}
                  expanded={expanded.has(s.type)}
                  onToggleExpand={() => toggleExpand(s.type)}
                  onChange={(k, v) => setSection(index, k, v)}
                  errors={form.errors}
                  disabled={disabled}
                />
              )}
            />
            {missing.length > 0 && !disabled && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                <span className="text-xs text-muted">Add a section:</span>
                {missing.map((t) => (
                  <Button key={t} size="xs" variant="outline" icon={<Plus className="h-3 w-3" />} onClick={() => form.set(['sections'], [...sections, newSection(t)])}>
                    {SECTION_META[t].label}
                  </Button>
                ))}
              </div>
            )}
          </Card>

          <FeaturedPicker value={value.featuredProjectIds ?? []} onChange={(ids) => form.set(['featuredProjectIds'], ids)} error={form.errors.featuredProjectIds} disabled={disabled} />

          <Card>
            <Switch
              checked={value.showArchive ?? true}
              onChange={(v) => form.set(['showArchive'], v)}
              disabled={disabled}
              label="Show project archive"
              description="List the remaining published projects below the featured ones."
            />
          </Card>
        </div>

        <div className="min-w-0 xl:sticky xl:top-20 xl:self-start">
          <PreviewFrame version={doc.data?.updatedAt} height="h-[60vh] xl:h-[calc(100vh-12rem)]" />
          <p className="mt-2 text-xs text-muted">The preview shows the saved draft — save to refresh it.</p>
        </div>
      </div>

      <PublishBar
        dirty={form.dirty}
        hasUnpublishedChanges={doc.data?.hasUnpublishedChanges}
        publishedAt={doc.data?.publishedAt}
        onSaveDraft={() => ed.saveDraft()}
        onPublish={ed.publish}
        onDiscard={() => setConfirmDiscard(true)}
        saving={ed.saving}
        publishing={ed.publishing}
        discarding={ed.discarding}
        canSave={ed.canWrite}
        canPublish={ed.canPublish}
      />

      <ConfirmDialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={async () => {
          await ed.discard()
          setConfirmDiscard(false)
        }}
        loading={ed.discarding}
        title="Discard homepage changes?"
        description={doc.data?.hasUnpublishedChanges ? 'Your draft will be reset to the published homepage.' : 'Your unsaved edits will be lost.'}
        confirmLabel="Discard"
      />
      <VersionHistory open={history} onClose={() => setHistory(false)} entityType="homepage" entityId="HOMEPAGE" title="Homepage versions" onRestored={ed.reload} />
    </div>
  )
}
