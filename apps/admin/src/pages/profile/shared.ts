import type { Profile } from '@pg/shared'

/** Props every profile form section receives. */
export interface SectionProps {
  p: Profile
  set: (path: (string | number)[], v: unknown) => void
  err: (path: string) => string | undefined
  disabled: boolean
}

/** Used only when no profile document exists yet. */
export const EMPTY_PROFILE: Profile = {
  fullName: '',
  firstName: '',
  initials: '',
  title: '',
  tagline: '',
  shortBio: '',
  longBio: '',
  photoId: null,
  coverId: null,
  resumeId: null,
  location: '',
  showLocation: true,
  email: '',
  links: { github: '', linkedin: '', leetcode: '', others: [] },
  availability: { available: false, label: '' },
  hero: { roles: [''], description: '' },
  about: { heading: '', lead: '', paragraphs: [], principles: [], facts: [] },
  exploring: [],
}
