import { FieldRow, FormSection } from '../../components/profile/FormSection'
import { Input, ListEditor, Switch } from '../../components/ui'
import type { SectionProps } from './shared'

export function ContactSection({ p, set, err, disabled }: SectionProps) {
  const l = p.links
  return (
    <FormSection id="contact" title="Contact & links" description="Links must start with https:// (or http://). Leave a profile link empty to hide it.">
      <FieldRow>
        <Input label="Email" type="email" required maxLength={254} value={p.email} onChange={(e) => set(['email'], e.target.value)} error={err('email')} disabled={disabled} />
        <Input label="Location" maxLength={80} value={p.location} onChange={(e) => set(['location'], e.target.value)} error={err('location')} disabled={disabled} />
      </FieldRow>
      <Switch
        label="Show location on the site"
        description="When off, your location is kept here but not published."
        checked={p.showLocation}
        onChange={(v) => set(['showLocation'], v)}
        disabled={disabled}
      />
      <FieldRow>
        <Input label="GitHub" type="url" placeholder="https://github.com/…" value={l.github ?? ''} onChange={(e) => set(['links', 'github'], e.target.value)} error={err('links.github')} disabled={disabled} />
        <Input label="LinkedIn" type="url" placeholder="https://www.linkedin.com/in/…" value={l.linkedin ?? ''} onChange={(e) => set(['links', 'linkedin'], e.target.value)} error={err('links.linkedin')} disabled={disabled} />
      </FieldRow>
      <Input label="LeetCode" type="url" placeholder="https://leetcode.com/u/…" value={l.leetcode ?? ''} onChange={(e) => set(['links', 'leetcode'], e.target.value)} error={err('links.leetcode')} disabled={disabled} />
      <ListEditor
        label="Other links"
        items={l.others}
        max={10}
        onChange={(v) => set(['links', 'others'], v)}
        create={() => ({ label: '', href: '' })}
        addLabel="Add link"
        error={err('links.others')}
        render={(it, update, i) => (
          <div className="grid gap-2 sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)]">
            <Input aria-label={`Link ${i + 1} label`} placeholder="Label" maxLength={40} value={it.label} onChange={(e) => update({ ...it, label: e.target.value })} error={err(`links.others.${i}.label`)} disabled={disabled} />
            <Input aria-label={`Link ${i + 1} URL`} type="url" placeholder="https://" value={it.href} onChange={(e) => update({ ...it, href: e.target.value })} error={err(`links.others.${i}.href`)} disabled={disabled} />
          </div>
        )}
      />
    </FormSection>
  )
}

export function AvailabilitySection({ p, set, err, disabled }: SectionProps) {
  return (
    <FormSection id="availability" title="Availability" description="The status pill in the hero.">
      <Switch
        label="Open to opportunities"
        description="Shows a green availability badge on the site."
        checked={p.availability.available}
        onChange={(v) => set(['availability', 'available'], v)}
        disabled={disabled}
      />
      <Input
        label="Label"
        maxLength={60}
        showCount
        placeholder="Available for opportunities"
        value={p.availability.label}
        onChange={(e) => set(['availability', 'label'], e.target.value)}
        error={err('availability.label')}
        disabled={disabled}
      />
    </FormSection>
  )
}
