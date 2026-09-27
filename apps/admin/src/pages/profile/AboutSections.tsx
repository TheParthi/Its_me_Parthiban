import { FieldRow, FormSection } from '../../components/profile/FormSection'
import { Input, ListEditor, Textarea } from '../../components/ui'
import type { SectionProps } from './shared'

export function AboutSection({ p, set, err, disabled }: SectionProps) {
  const a = p.about
  return (
    <FormSection id="about" title="About" description="The About section: heading, lead, paragraphs, principles and quick facts.">
      <Input label="Heading" maxLength={80} value={a.heading} onChange={(e) => set(['about', 'heading'], e.target.value)} error={err('about.heading')} disabled={disabled} />
      <Textarea label="Lead" maxLength={600} rows={3} value={a.lead} onChange={(e) => set(['about', 'lead'], e.target.value)} error={err('about.lead')} disabled={disabled} />
      <ListEditor
        label="Paragraphs"
        items={a.paragraphs}
        max={6}
        onChange={(v) => set(['about', 'paragraphs'], v)}
        create={() => ''}
        addLabel="Add paragraph"
        error={err('about.paragraphs')}
        render={(t, update, i) => (
          <Textarea aria-label={`Paragraph ${i + 1}`} maxLength={800} rows={3} value={t} onChange={(e) => update(e.target.value)} error={err(`about.paragraphs.${i}`)} disabled={disabled} />
        )}
      />
      <ListEditor
        label="Principles"
        description="Short title with a one-line explanation."
        items={a.principles}
        max={6}
        onChange={(v) => set(['about', 'principles'], v)}
        create={() => ({ title: '', text: '' })}
        addLabel="Add principle"
        error={err('about.principles')}
        render={(it, update, i) => (
          <div className="grid gap-2 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
            <Input
              aria-label={`Principle ${i + 1} title`}
              placeholder="Title"
              maxLength={30}
              value={it.title}
              onChange={(e) => update({ ...it, title: e.target.value })}
              error={err(`about.principles.${i}.title`)}
              disabled={disabled}
            />
            <Input
              aria-label={`Principle ${i + 1} text`}
              placeholder="Text"
              maxLength={160}
              value={it.text}
              onChange={(e) => update({ ...it, text: e.target.value })}
              error={err(`about.principles.${i}.text`)}
              disabled={disabled}
            />
          </div>
        )}
      />
      <ListEditor
        label="Quick facts"
        description="Key / value pairs, e.g. “Now” → “Software Engineer Intern”."
        items={a.facts}
        max={8}
        onChange={(v) => set(['about', 'facts'], v)}
        create={() => ({ k: '', v: '' })}
        addLabel="Add fact"
        error={err('about.facts')}
        render={(it, update, i) => (
          <div className="grid gap-2 sm:grid-cols-[minmax(0,8rem)_minmax(0,1fr)]">
            <Input aria-label={`Fact ${i + 1} key`} placeholder="Key" maxLength={20} value={it.k} onChange={(e) => update({ ...it, k: e.target.value })} error={err(`about.facts.${i}.k`)} disabled={disabled} />
            <Input aria-label={`Fact ${i + 1} value`} placeholder="Value" maxLength={80} value={it.v} onChange={(e) => update({ ...it, v: e.target.value })} error={err(`about.facts.${i}.v`)} disabled={disabled} />
          </div>
        )}
      />
    </FormSection>
  )
}

export function ExploringSection({ p, set, err, disabled }: SectionProps) {
  return (
    <FormSection id="exploring" title="Currently exploring" description="Topics you are learning right now, each with a short note.">
      <ListEditor
        items={p.exploring}
        max={12}
        onChange={(v) => set(['exploring'], v)}
        create={() => ({ topic: '', note: '' })}
        addLabel="Add topic"
        error={err('exploring')}
        render={(it, update, i) => (
          <FieldRow className="gap-2">
            <Input aria-label={`Topic ${i + 1}`} placeholder="Topic" maxLength={80} value={it.topic} onChange={(e) => update({ ...it, topic: e.target.value })} error={err(`exploring.${i}.topic`)} disabled={disabled} />
            <Input aria-label={`Topic ${i + 1} note`} placeholder="Note" maxLength={200} value={it.note} onChange={(e) => update({ ...it, note: e.target.value })} error={err(`exploring.${i}.note`)} disabled={disabled} />
          </FieldRow>
        )}
      />
    </FormSection>
  )
}
