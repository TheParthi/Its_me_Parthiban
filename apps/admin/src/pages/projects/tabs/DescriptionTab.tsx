import { MarkdownEditor } from '../../../components/editor/MarkdownEditor'
import { Card, Textarea } from '../../../components/ui'
import type { TabProps } from '../projectModel'

export function DescriptionTab({ value: v, set, errors, disabled }: TabProps) {
  return (
    <div className="space-y-5">
      <Card>
        <Textarea
          label="Short description"
          maxLength={400}
          rows={3}
          value={v.shortDescription}
          onChange={(e) => set('shortDescription', e.target.value)}
          error={errors.shortDescription}
          hint="Shown on project cards and in link previews. Plain text."
          disabled={disabled}
        />
      </Card>
      <Card>
        <MarkdownEditor
          label="Description"
          hint="The main write-up. Markdown; raw HTML is stripped on save."
          value={v.description}
          onChange={(x) => set('description', x)}
          maxLength={20000}
          error={errors.description}
          rows={14}
        />
      </Card>
      <Card>
        <MarkdownEditor
          label="My contribution"
          hint="What you personally built or owned. Optional."
          value={v.contribution ?? ''}
          onChange={(x) => set('contribution', x)}
          maxLength={8000}
          error={errors.contribution}
          rows={8}
        />
      </Card>
    </div>
  )
}
