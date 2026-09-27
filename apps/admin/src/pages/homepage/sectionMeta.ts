import type { SectionConfig, SectionType } from '@pg/shared'

export const SECTION_META: Record<SectionType, { label: string; description: string }> = {
  hero: { label: 'Hero', description: 'Name, roles and the opening statement. Always shown.' },
  about: { label: 'About', description: 'Biography and identity cards.' },
  projects: { label: 'Projects', description: 'Featured case studies and the archive.' },
  lab: { label: 'Engineering Lab', description: 'Systems, experiments and engineering notes.' },
  skills: { label: 'Skills', description: 'Skill categories and proficiency.' },
  experience: { label: 'Experience', description: 'Work timeline and milestones.' },
  education: { label: 'Education', description: 'Degrees and certifications.' },
  achievements: { label: 'Achievements', description: 'Awards and recognitions.' },
  exploring: { label: 'Currently Exploring', description: 'What you are learning now.' },
  contact: { label: 'Contact', description: 'Call to action and the contact form.' },
  footer: { label: 'Footer', description: 'Links and copyright.' },
}

export type Background = SectionConfig['background']
export type Spacing = SectionConfig['spacing']

export const BACKGROUNDS: { value: Background; label: string; swatch: string }[] = [
  { value: 'default', label: 'Default', swatch: 'linear-gradient(180deg,#101218,#08090d)' },
  {
    value: 'grid',
    label: 'Grid',
    swatch: 'linear-gradient(rgba(255,255,255,.09) 1px,transparent 1px) 0 0/8px 8px,linear-gradient(90deg,rgba(255,255,255,.09) 1px,transparent 1px) 0 0/8px 8px,#08090d',
  },
  { value: 'glow', label: 'Glow', swatch: 'radial-gradient(circle at 50% 30%,rgba(139,92,246,.7),transparent 60%),radial-gradient(circle at 80% 90%,rgba(0,229,255,.45),transparent 55%),#08090d' },
  { value: 'plain', label: 'Plain', swatch: '#08090d' },
]

export const SPACINGS: { value: Spacing; label: string }[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'normal', label: 'Normal' },
  { value: 'spacious', label: 'Spacious' },
]

export const newSection = (type: SectionType): SectionConfig => ({
  type,
  enabled: true,
  eyebrow: '',
  heading: '',
  description: '',
  background: 'default',
  spacing: 'normal',
})
