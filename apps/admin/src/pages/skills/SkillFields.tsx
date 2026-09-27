import type { SkillInput } from '@pg/shared'
import { MediaField, type EntryForm } from '../../components/entries'
import { Input, Select, Switch, TagInput } from '../../components/ui'
import type { SkillCategory } from '../../lib/types'

export const blankSkill = (categoryId = ''): SkillInput => ({
  name: '',
  categoryId,
  note: '',
  related: [],
  iconId: null,
  featured: false,
  visible: true,
  proficiency: null,
})

const LEVELS = ['1', '2', '3', '4', '5'] as const

export function SkillFields({
  form: { value: v, set, errors: e, readOnly },
  categories,
  suggestions,
}: {
  form: EntryForm<SkillInput>
  categories: SkillCategory[]
  suggestions: string[]
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Name" required maxLength={40} value={v.name} onChange={(x) => set('name', x.target.value)} error={e.name} data-autofocus />
        <Select
          label="Category"
          required
          value={v.categoryId}
          placeholder="Choose a category"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          onChange={(id) => set('categoryId', id)}
          error={e.categoryId}
          hint={categories.length ? undefined : 'Create a category first.'}
        />
      </div>
      <Input
        label="Note"
        maxLength={200}
        showCount
        placeholder="Short context, e.g. “600+ LeetCode problems”"
        value={v.note ?? ''}
        onChange={(x) => set('note', x.target.value)}
        error={e.note}
      />
      <TagInput
        label="Related skills"
        hint="Up to 10. Start typing to pick from your existing skills."
        value={v.related ?? []}
        onChange={(n) => set('related', n)}
        suggestions={suggestions.filter((s) => s !== v.name)}
        max={10}
        maxLength={40}
        error={e.related}
      />
      <MediaField label="Icon" hint="Optional. Pick an image from the media library." category="ICON" value={v.iconId} onChange={(id) => set('iconId', id)} error={e.iconId} disabled={readOnly} />
      <Select
        label="Proficiency (optional)"
        value={v.proficiency ? String(v.proficiency) : ''}
        placeholder="Not set"
        options={[...LEVELS.map((l) => ({ value: l, label: `${l} of 5` }))]}
        onChange={(x) => set('proficiency', x ? Number(x) : null)}
        hint="A manual 1–5 level for your own reference. Leave unset if you prefer — it is never displayed as a percentage."
        error={e.proficiency}
      />
      <div className="space-y-3 rounded-lg border border-line bg-white/[0.02] p-3">
        <Switch label="Featured" description="Highlight this skill on the site." checked={!!v.featured} onChange={(c) => set('featured', c)} />
        <Switch label="Visible on the site" description="Hidden skills stay in the admin but are never shown publicly." checked={v.visible ?? true} onChange={(c) => set('visible', c)} />
      </div>
    </>
  )
}
