import { Card, SectionTitle, TagInput } from '../../../components/ui'
import type { TabProps } from '../projectModel'

export function TechTab({ value: v, set, errors, suggestions }: TabProps & { suggestions?: string[] }) {
  const itemErr = Object.entries(errors).find(([k]) => k.startsWith('technologies.'))?.[1]
  return (
    <Card className="space-y-4">
      <SectionTitle description="Shown as chips in the order below. Drag a chip by its handle to reorder; Enter or comma adds, Backspace removes the last.">
        Technology stack
      </SectionTitle>
      <TagInput
        label="Technologies"
        value={v.technologies}
        onChange={(t) => set('technologies', t)}
        max={30}
        maxLength={40}
        sortable
        suggestions={suggestions}
        placeholder="e.g. NestJS, PostgreSQL, React Native"
        error={errors.technologies ?? itemErr}
      />
    </Card>
  )
}
