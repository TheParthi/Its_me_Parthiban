import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { skillInputSchema, type SkillInput } from '@pg/shared'
import { Plus, Send, Sparkles } from 'lucide-react'
import { EntryDrawer, EntryList, TrashNote, useEntryMutations, useTrashedEntries, type EntrySource } from '../../components/entries'
import { Button, ConfirmDialog, ErrorState, PageHeader, Segmented, SkeletonRows, useToast } from '../../components/ui'
import { post } from '../../lib/api'
import { useCan } from '../../lib/auth'
import { qk, useSkillCategories, useSkills } from '../../lib/queries'
import type { SkillAdmin } from '../../lib/types'
import { CategoriesPanel } from './CategoriesPanel'
import { SkillFields, blankSkill } from './SkillFields'
import { SkillGroups } from './SkillGroups'

const SRC: EntrySource = { base: '/admin/skills', key: qk.skills }

export default function SkillsPage() {
  const skills = useSkills()
  const cats = useSkillCategories()
  const trash = useTrashedEntries<SkillAdmin>(SRC)
  const mutations = useEntryMutations<SkillAdmin>(SRC)
  const toast = useToast()
  const qc = useQueryClient()
  const can = useCan()
  const canWrite = can('content:write')
  const canPublish = can('content:publish')

  const [view, setView] = useState<'live' | 'trash'>('live')
  const [drawer, setDrawer] = useState<{ open: boolean; session: number; entry: SkillAdmin | null; categoryId: string }>({ open: false, session: 0, entry: null, categoryId: '' })
  const [confirmAll, setConfirmAll] = useState(false)

  const pending = (skills.data ?? []).filter((s) => s.hasUnpublishedChanges).length
  const names = useMemo(() => [...new Set((skills.data ?? []).map((s) => s.name))].sort((a, b) => a.localeCompare(b)), [skills.data])
  const categories = cats.data ?? []

  const publishAll = useMutation({
    mutationFn: () => post<{ published: number }>('/admin/skills/publish-all'),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: qk.skills })
      toast.success(r.published ? `Published ${r.published} skill${r.published === 1 ? '' : 's'}` : 'Nothing to publish')
    },
    onError: (e) => toast.fromError(e, 'Could not publish all skills'),
  })

  const open = (entry: SkillAdmin | null, categoryId = '') =>
    setDrawer((d) => ({ open: true, session: d.session + 1, entry, categoryId: categoryId || entry?.categoryId || categories[0]?.id || '' }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Skills"
        description="Grouped by category, in the order shown on the site. Skill edits are drafts until published."
        actions={
          <>
            <Button
              onClick={() => setConfirmAll(true)}
              disabled={!canPublish || !pending}
              title={!canPublish ? 'You do not have permission to publish' : pending ? undefined : 'Every skill is already published'}
              icon={<Send className="h-4 w-4" />}
            >
              Publish all{pending ? ` (${pending})` : ''}
            </Button>
            <Button variant="primary" onClick={() => open(null)} disabled={!canWrite || !categories.length} title={!canWrite ? 'You do not have permission' : !categories.length ? 'Create a category first' : undefined} icon={<Plus className="h-4 w-4" />}>
              New skill
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <Segmented
            size="sm"
            aria-label="Show skills"
            value={view}
            onChange={setView}
            options={[
              { value: 'live', label: `Skills${skills.data ? ` (${skills.data.length})` : ''}` },
              { value: 'trash', label: `Trash${trash.data ? ` (${trash.data.length})` : ''}` },
            ]}
          />
          {view === 'live' ? (
            skills.isLoading || cats.isLoading ? (
              <SkeletonRows rows={6} />
            ) : skills.isError || cats.isError ? (
              <ErrorState error={skills.error ?? cats.error} onRetry={() => (skills.refetch(), cats.refetch())} />
            ) : (
              <SkillGroups skills={skills.data ?? []} categories={categories} mutations={mutations} canWrite={canWrite} onOpen={(s) => open(s)} onNew={(c) => open(null, c)} />
            )
          ) : (
            <div className="space-y-3">
              <TrashNote count={trash.data?.length ?? 0} />
              <EntryList
                query={trash}
                mutations={mutations}
                sortable={false}
                label="trashed skills"
                onOpen={(s) => open(s)}
                empty={{ icon: <Sparkles className="h-5 w-5" />, title: 'Trash is empty' }}
                renderRow={(s) => (
                  <>
                    <p className="truncate text-sm font-medium text-fg">{s.name}</p>
                    <p className="mt-0.5 text-xs text-muted">{categories.find((c) => c.id === s.categoryId)?.name ?? 'Unknown category'}</p>
                  </>
                )}
              />
            </div>
          )}
        </div>
        <CategoriesPanel />
      </div>

      <EntryDrawer<SkillAdmin, SkillInput>
        open={drawer.open}
        session={drawer.session}
        onClose={() => setDrawer((d) => ({ ...d, open: false }))}
        entry={drawer.entry}
        noun="skill"
        schema={skillInputSchema}
        blank={blankSkill(drawer.categoryId)}
        mutations={mutations}
        heading={(d) => d.name}
        renderFields={(f) => <SkillFields form={f} categories={categories} suggestions={names} />}
      />

      <ConfirmDialog
        open={confirmAll}
        onClose={() => setConfirmAll(false)}
        onConfirm={async () => {
          await publishAll.mutateAsync().catch(() => undefined)
          setConfirmAll(false)
        }}
        tone="primary"
        title={`Publish ${pending} skill${pending === 1 ? '' : 's'}?`}
        description="Every skill with a new or changed draft goes live on the site at once. Skills in the trash are not affected."
        confirmLabel="Publish all"
      />
    </div>
  )
}
