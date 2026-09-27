import { MarkdownEditor } from '../../components/editor/MarkdownEditor'
import { FieldRow, FormSection } from '../../components/profile/FormSection'
import { Input, ListEditor, Textarea } from '../../components/ui'
import type { SectionProps } from './shared'

export function IdentitySection({ p, set, err, disabled }: SectionProps) {
  return (
    <FormSection id="identity" title="Identity" description="How your name and headline appear across the site.">
      <FieldRow>
        <Input label="Full name" required maxLength={80} value={p.fullName} onChange={(e) => set(['fullName'], e.target.value)} error={err('fullName')} disabled={disabled} />
        <Input label="First name" required maxLength={40} value={p.firstName} onChange={(e) => set(['firstName'], e.target.value)} error={err('firstName')} disabled={disabled} />
      </FieldRow>
      <FieldRow>
        <Input
          label="Initials"
          required
          maxLength={4}
          hint="Used for the logo mark and avatar fallback."
          value={p.initials}
          onChange={(e) => set(['initials'], e.target.value)}
          error={err('initials')}
          disabled={disabled}
        />
        <Input label="Title" maxLength={120} value={p.title} onChange={(e) => set(['title'], e.target.value)} error={err('title')} disabled={disabled} />
      </FieldRow>
      <Input
        label="Tagline"
        maxLength={160}
        showCount
        value={p.tagline}
        onChange={(e) => set(['tagline'], e.target.value)}
        error={err('tagline')}
        disabled={disabled}
      />
    </FormSection>
  )
}

export function HeroSection({ p, set, err, disabled }: SectionProps) {
  return (
    <FormSection id="hero" title="Hero" description="The rotating roles and the line under your name on the homepage.">
      <ListEditor
        label="Roles"
        description="Shown in order; use the arrows to reorder. At least one."
        items={p.hero.roles}
        max={8}
        onChange={(v) => set(['hero', 'roles'], v)}
        create={() => ''}
        addLabel="Add role"
        error={err('hero.roles')}
        render={(role, update, i) => (
          <Input aria-label={`Role ${i + 1}`} maxLength={60} value={role} onChange={(e) => update(e.target.value)} error={err(`hero.roles.${i}`)} disabled={disabled} />
        )}
      />
      <Textarea
        label="Description"
        maxLength={300}
        rows={3}
        value={p.hero.description}
        onChange={(e) => set(['hero', 'description'], e.target.value)}
        error={err('hero.description')}
        disabled={disabled}
      />
    </FormSection>
  )
}

export function BiosSection({ p, set, err, disabled }: SectionProps) {
  return (
    <FormSection id="bios" title="Bios" description="A short summary for cards and meta tags, and a longer Markdown bio.">
      <Textarea
        label="Short bio"
        maxLength={400}
        rows={3}
        value={p.shortBio}
        onChange={(e) => set(['shortBio'], e.target.value)}
        error={err('shortBio')}
        disabled={disabled}
      />
      <MarkdownEditor
        label="Long bio"
        hint="Markdown. Raw HTML is removed when saving."
        maxLength={8000}
        rows={10}
        value={p.longBio}
        onChange={(v) => set(['longBio'], v)}
        error={err('longBio')}
      />
    </FormSection>
  )
}
