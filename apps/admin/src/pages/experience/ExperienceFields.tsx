import type { ExperienceInput } from '@pg/shared'
import type { EntryForm } from '../../components/entries'
import { fromMonthInput, toMonthInput } from '../../components/entries'
import { Input, ListEditor, Select, Switch, TagInput, Textarea, opts } from '../../components/ui'

export const EMPLOYMENT_TYPES = ['Internship', 'Full-time', 'Part-time', 'Contract', 'Freelance', 'Volunteer'] as const

export const blankExperience: ExperienceInput = {
  position: '',
  organization: '',
  employmentType: 'Internship',
  location: '',
  startDate: null,
  endDate: null,
  current: false,
  description: '',
  responsibilities: [],
  technologies: [],
  visible: true,
}

export function ExperienceFields({ value: v, set, errors: e }: EntryForm<ExperienceInput>) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Position" required value={v.position} maxLength={100} onChange={(x) => set('position', x.target.value)} error={e.position} data-autofocus />
        <Input label="Organization" required value={v.organization} maxLength={100} onChange={(x) => set('organization', x.target.value)} error={e.organization} />
        <Select
          label="Employment type"
          value={v.employmentType ?? 'Internship'}
          options={opts(EMPLOYMENT_TYPES)}
          onChange={(x) => set('employmentType', x)}
          error={e.employmentType}
        />
        <Input label="Location" value={v.location ?? ''} maxLength={80} placeholder="e.g. Remote, Chennai" onChange={(x) => set('location', x.target.value)} error={e.location} />
        <Input
          label="Start month"
          type="month"
          value={toMonthInput(v.startDate)}
          onChange={(x) => set('startDate', fromMonthInput(x.target.value))}
          error={e.startDate}
        />
        <Input
          label="End month"
          type="month"
          value={v.current ? '' : toMonthInput(v.endDate)}
          disabled={v.current}
          hint={v.current ? 'Shown as “Present” while this is your current role.' : undefined}
          onChange={(x) => set('endDate', fromMonthInput(x.target.value))}
          error={e.endDate}
        />
      </div>
      <Switch
        label="I currently work here"
        description="Disables the end date and shows “Present”."
        checked={!!v.current}
        onChange={(c) => {
          set('current', c)
          if (c) set('endDate', null)
        }}
      />
      <Textarea label="Summary" rows={3} maxLength={400} showCount value={v.description ?? ''} onChange={(x) => set('description', x.target.value)} error={e.description} />
      <ListEditor<string>
        label="Responsibilities"
        description="One achievement or duty per line — keep them concrete."
        items={v.responsibilities ?? []}
        onChange={(n) => set('responsibilities', n)}
        create={() => ''}
        max={12}
        addLabel="Add responsibility"
        error={e.responsibilities}
        render={(item, update, i) => (
          <Textarea
            aria-label={`Responsibility ${i + 1}`}
            rows={2}
            maxLength={400}
            value={item}
            onChange={(x) => update(x.target.value)}
            error={e[`responsibilities.${i}`]}
          />
        )}
      />
      <TagInput label="Technologies" value={v.technologies ?? []} onChange={(n) => set('technologies', n)} max={20} maxLength={40} sortable error={e.technologies} />
      <Switch label="Visible on the site" description="Hidden entries stay in the admin but are never shown publicly." checked={v.visible ?? true} onChange={(c) => set('visible', c)} />
    </>
  )
}
