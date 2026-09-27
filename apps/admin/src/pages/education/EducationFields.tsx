import type { EducationInput } from '@pg/shared'
import type { EntryForm } from '../../components/entries'
import { Input, ListEditor, NumberInput, Switch, Textarea } from '../../components/ui'

export const blankEducation: EducationInput = {
  institution: '',
  degree: '',
  field: '',
  startYear: null,
  graduationYear: null,
  grade: '',
  description: '',
  achievements: [],
  visible: true,
}

export function EducationFields({ value: v, set, errors: e }: EntryForm<EducationInput>) {
  return (
    <>
      <Input label="Institution" required maxLength={120} value={v.institution} onChange={(x) => set('institution', x.target.value)} error={e.institution} data-autofocus />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Degree" required maxLength={120} placeholder="e.g. B.E." value={v.degree} onChange={(x) => set('degree', x.target.value)} error={e.degree} />
        <Input label="Field of study" maxLength={120} value={v.field ?? ''} onChange={(x) => set('field', x.target.value)} error={e.field} />
        <NumberInput label="Start year" min={1950} max={2100} placeholder="YYYY" value={v.startYear} onChange={(n) => set('startYear', n)} error={e.startYear} />
        <NumberInput
          label="Graduation year"
          min={1950}
          max={2100}
          placeholder="YYYY"
          hint="Expected year is fine."
          value={v.graduationYear}
          onChange={(n) => set('graduationYear', n)}
          error={e.graduationYear}
        />
        <Input label="Grade" maxLength={40} placeholder="e.g. CGPA 7.8 / 10" value={v.grade ?? ''} onChange={(x) => set('grade', x.target.value)} error={e.grade} />
      </div>
      <Textarea label="Description" rows={3} maxLength={600} showCount value={v.description ?? ''} onChange={(x) => set('description', x.target.value)} error={e.description} />
      <ListEditor<string>
        label="Highlights"
        description="Awards, coursework or activities during this programme."
        items={v.achievements ?? []}
        onChange={(n) => set('achievements', n)}
        create={() => ''}
        max={10}
        addLabel="Add highlight"
        error={e.achievements}
        render={(item, update, i) => (
          <Input aria-label={`Highlight ${i + 1}`} maxLength={200} value={item} onChange={(x) => update(x.target.value)} error={e[`achievements.${i}`]} />
        )}
      />
      <Switch label="Visible on the site" description="Hidden entries stay in the admin but are never shown publicly." checked={v.visible ?? true} onChange={(c) => set('visible', c)} />
    </>
  )
}
