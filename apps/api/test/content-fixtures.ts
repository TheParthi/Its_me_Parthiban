import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { DEFAULT_APPEARANCE, SECTION_TYPES } from '@pg/shared'
import { auth } from './helpers'

export const profile = {
  fullName: 'Ada Lovelace',
  firstName: 'Ada',
  initials: 'AL',
  title: 'Engineer',
  tagline: 'Analytical engines',
  shortBio: 'Writes programs.',
  longBio: 'First **programmer**.',
  photoId: null,
  coverId: null,
  resumeId: null,
  location: 'London',
  showLocation: true,
  email: 'ada@example.com',
  links: { github: '', linkedin: '', leetcode: '', others: [] },
  availability: { available: true, label: 'Open to work' },
  hero: { roles: ['Engineer'], description: 'Hello' },
  about: { heading: 'About', lead: 'Lead', paragraphs: [], principles: [], facts: [] },
  exploring: [],
}

export const homepage = {
  sections: SECTION_TYPES.map((type) => ({ type, enabled: true })),
  featuredProjectIds: [],
  showArchive: true,
}

export const seo = {
  siteUrl: 'https://ada.example.com/',
  title: 'Ada',
  description: 'Portfolio',
  ogTitle: '',
  ogDescription: '',
  ogImageId: null,
  canonicalUrl: '',
  robotsIndex: true,
  robotsFollow: true,
  twitterCard: 'summary',
  structuredData: false,
}

export const appearance = DEFAULT_APPEARANCE

export const project = (slug: string, extra: Record<string, unknown> = {}) => ({
  title: `Project ${slug}`,
  slug,
  category: 'Web',
  shortDescription: 'Short',
  description: 'Long description',
  technologies: ['TypeScript', 'NestJS'],
  ...extra,
})

/** Saves and publishes the singleton documents so the public bundle can be built. */
export async function publishSite(app: INestApplication, token: string) {
  const http = () => request(app.getHttpServer())
  for (const [key, body] of Object.entries({ profile, homepage, appearance, seo })) {
    await http().put(`/api/admin/documents/${key}`).set(auth(token)).send(body).expect(200)
    await http().post(`/api/admin/documents/${key}/publish`).set(auth(token)).expect(200)
  }
}
