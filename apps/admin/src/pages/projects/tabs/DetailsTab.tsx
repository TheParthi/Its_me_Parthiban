import { FEATURE_STATUS } from '@pg/shared'
import { Card, Input, ListEditor, SectionTitle, Select, TagInput, Textarea } from '../../../components/ui'
import type { FieldErrors } from '../../../lib/forms'
import type { TabProps } from '../projectModel'

const FEATURE_LABELS: Record<(typeof FEATURE_STATUS)[number], string> = { shipped: 'Shipped', 'in-progress': 'In progress', proposed: 'Proposed' }

/** Error for `prefix.i.field`, or for the list itself. */
const at = (errors: FieldErrors, prefix: string, i: number, field: string) => errors[`${prefix}.${i}.${field}`] ?? errors[`${prefix}.${i}`]
const listErr = (errors: FieldErrors, key: string) => errors[key]

export function DetailsTab({ value: v, set, errors, disabled }: TabProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card className="xl:col-span-2">
        <ListEditor
          label="Features"
          description="Capabilities, each with a delivery status."
          items={v.features}
          onChange={(x) => set('features', x)}
          create={() => ({ text: '', status: 'shipped' as const })}
          max={20}
          addLabel="Add feature"
          error={listErr(errors, 'features')}
          render={(f, update, i) => (
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem]">
              <Input aria-label={`Feature ${i + 1}`} placeholder="What it does" maxLength={200} value={f.text} onChange={(e) => update({ ...f, text: e.target.value })} error={at(errors, 'features', i, 'text')} disabled={disabled} />
              <Select aria-label={`Feature ${i + 1} status`} value={f.status} onChange={(s) => update({ ...f, status: s })} options={FEATURE_STATUS.map((s) => ({ value: s, label: FEATURE_LABELS[s] }))} disabled={disabled} />
            </div>
          )}
        />
      </Card>

      <Card>
        <ListEditor
          label="Challenges"
          description="Hard problems and how they were solved."
          items={v.challenges}
          onChange={(x) => set('challenges', x)}
          create={() => ({ title: '', text: '' })}
          max={10}
          addLabel="Add challenge"
          error={listErr(errors, 'challenges')}
          render={(c, update, i) => (
            <div className="space-y-2">
              <Input aria-label={`Challenge ${i + 1} title`} placeholder="Title" maxLength={80} value={c.title} onChange={(e) => update({ ...c, title: e.target.value })} error={at(errors, 'challenges', i, 'title')} disabled={disabled} />
              <Textarea aria-label={`Challenge ${i + 1} text`} placeholder="What happened and how you solved it" maxLength={600} rows={3} value={c.text} onChange={(e) => update({ ...c, text: e.target.value })} error={errors[`challenges.${i}.text`]} disabled={disabled} />
            </div>
          )}
        />
      </Card>

      <Card>
        <ListEditor
          label="Architecture"
          description="Layers of the system, top to bottom."
          items={v.architecture}
          onChange={(x) => set('architecture', x)}
          create={() => ({ layer: '', detail: '' })}
          max={10}
          addLabel="Add layer"
          error={listErr(errors, 'architecture')}
          render={(a, update, i) => (
            <div className="space-y-2">
              <Input aria-label={`Layer ${i + 1} name`} placeholder="Layer (e.g. API)" maxLength={40} value={a.layer} onChange={(e) => update({ ...a, layer: e.target.value })} error={at(errors, 'architecture', i, 'layer')} disabled={disabled} />
              <Textarea aria-label={`Layer ${i + 1} detail`} placeholder="Detail" maxLength={400} rows={2} value={a.detail} onChange={(e) => update({ ...a, detail: e.target.value })} error={errors[`architecture.${i}.detail`]} disabled={disabled} />
            </div>
          )}
        />
      </Card>

      <Card className="space-y-5">
        <SectionTitle>Team & links</SectionTitle>
        <TagInput label="Team members" value={v.team} onChange={(t) => set('team', t)} max={20} maxLength={80} placeholder="Name, then Enter" error={errors.team ?? Object.entries(errors).find(([k]) => k.startsWith('team.'))?.[1]} />
        <Input label="Repository URL" type="url" placeholder="https://github.com/…" value={v.repoUrl ?? ''} onChange={(e) => set('repoUrl', e.target.value)} error={errors.repoUrl} disabled={disabled} />
        <Input label="Live demo URL" type="url" placeholder="https://…" value={v.demoUrl ?? ''} onChange={(e) => set('demoUrl', e.target.value)} error={errors.demoUrl} disabled={disabled} />
      </Card>

      <Card className="space-y-5">
        <ListEditor
          label="Extra links"
          description="Store pages, docs, write-ups."
          items={v.links}
          onChange={(x) => set('links', x)}
          create={() => ({ label: '', href: '' })}
          max={8}
          addLabel="Add link"
          error={listErr(errors, 'links')}
          render={(l, update, i) => (
            <div className="grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)]">
              <Input aria-label={`Link ${i + 1} label`} placeholder="Label" maxLength={40} value={l.label} onChange={(e) => update({ ...l, label: e.target.value })} error={at(errors, 'links', i, 'label')} disabled={disabled} />
              <Input aria-label={`Link ${i + 1} URL`} type="url" placeholder="https://…" value={l.href} onChange={(e) => update({ ...l, href: e.target.value })} error={errors[`links.${i}.href`]} disabled={disabled} />
            </div>
          )}
        />
        <Textarea label="Note" maxLength={300} rows={2} value={v.note ?? ''} onChange={(e) => set('note', e.target.value)} error={errors.note} hint="Small print, e.g. “Source is proprietary.”" disabled={disabled} />
      </Card>
    </div>
  )
}
