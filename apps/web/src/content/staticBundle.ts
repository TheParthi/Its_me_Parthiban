import type { PublicBundle, PublicProject } from '@pg/shared'
import { milestones } from '../data/experience'
import { about, exploring, profile } from '../data/profile'
import { archiveProjects, featuredProjects } from '../data/projects'
import { skillCategories, skills } from '../data/skills'
import { DEFAULT_APPEARANCE } from './defaults'

// Builds a PublicBundle from the static files in src/data, mirroring the
// mapping in apps/api/prisma/seed.ts, so the site renders exactly as before
// when no API is configured or reachable.

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const MONTHS: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
}
const ym = (s: string | undefined) => {
  const m = s?.match(/([A-Z][a-z]{2}) (\d{4})/)
  return m ? `${m[2]}-${MONTHS[m[1]]}` : null
}

const CATEGORY_COLORS: Record<string, string> = {
  Programming: '#8B5CF6',
  Frontend: '#00E5FF',
  Backend: '#34D399',
  Databases: '#FFD166',
  Mobile: '#FF9F43',
  'Tools & Platforms': '#F472B6',
}

const projectBase = {
  fullTitle: '',
  statusLabel: '',
  contribution: '',
  accent: '#00E5FF',
  cover: null,
  screenshots: [],
  videoUrl: '',
  repoUrl: '',
  demoUrl: '',
  links: [],
  technologies: [],
  features: [],
  challenges: [],
  architecture: [],
  team: [],
  note: '',
  featured: false,
  visibility: 'PUBLIC',
  startDate: null,
  endDate: null,
  seoTitle: '',
  seoDescription: '',
} satisfies Partial<PublicProject>

function buildProjects(): PublicProject[] {
  const featured: PublicProject[] = featuredProjects.map((fp) => ({
    ...projectBase,
    id: fp.id,
    slug: fp.id,
    title: fp.title,
    fullTitle: fp.fullTitle ?? '',
    category: fp.category,
    statusLabel: fp.status,
    shortDescription: fp.description,
    description: fp.description,
    accent: fp.accent,
    previewStyle: fp.preview,
    links: fp.links,
    demoUrl: fp.links[0]?.href ?? '',
    technologies: fp.tech,
    features: fp.features,
    challenges: fp.challenges,
    architecture: fp.architecture,
    note: fp.note ?? '',
    featured: true,
  }))
  const archive: PublicProject[] = archiveProjects.map((ap) => {
    const slug = slugify(ap.title)
    return {
      ...projectBase,
      id: slug,
      slug,
      title: ap.title,
      category: ap.kind,
      shortDescription: ap.description,
      description: ap.description,
      previewStyle: 'image',
      repoUrl: ap.links.find((l) => l.label === 'Code')?.href ?? '',
      demoUrl: ap.links.find((l) => l.label === 'Live')?.href ?? '',
      links: ap.links,
      technologies: ap.tech,
      note: ap.note ?? '',
    }
  })
  return [...featured, ...archive]
}

function buildTimeline() {
  const experience: PublicBundle['experience'] = []
  const achievements: PublicBundle['achievements'] = []
  const certifications: PublicBundle['certifications'] = []
  milestones.forEach((m, i) => {
    const id = `m${i}`
    if (m.kind === 'Internship') {
      const [start, end] = m.date.split('—').map((x) => x.trim())
      const current = /present/i.test(end ?? '')
      experience.push({
        id,
        position: m.title,
        organization: m.org,
        employmentType: 'Internship',
        location: '',
        startDate: ym(start),
        endDate: current ? null : ym(end),
        current,
        description: m.detail,
        responsibilities: m.points ?? [],
        technologies: m.meta ?? [],
        visible: true,
      })
    } else if (m.kind === 'Certified') {
      // Hidden entries stay unpublished drafts in the CMS, so never public.
      if (m.hidden) return
      certifications.push({
        id,
        name: m.title,
        issuer: m.org,
        issueDate: null,
        expirationDate: null,
        credentialUrl: '',
        image: null,
        description: m.detail,
        visible: true,
      })
    } else {
      if (m.hidden) return
      const year = m.date.match(/\d{4}/)?.[0]
      achievements.push({
        id,
        title: m.title,
        kind: m.kind,
        event: m.org,
        date: year ? `${year}-01` : null,
        description: m.detail,
        media: null,
        verificationUrl: '',
        visible: true,
      })
    }
  })
  return { experience, achievements, certifications }
}

let cached: PublicBundle | null = null

/** The fallback bundle. Memoised: it is pure and built from constants. */
export function staticBundle(): PublicBundle {
  if (cached) return cached
  const siteUrl = 'https://theparthi.github.io/Its_me_Parthiban/'
  cached = {
    version: 'static',
    profile: {
      fullName: profile.name,
      firstName: profile.firstName,
      initials: profile.initials,
      title: 'Software Engineer',
      tagline: profile.tagline,
      shortBio: profile.summary,
      longBio: about.lead,
      photo: null,
      cover: null,
      resumeUrl: null,
      location: profile.location,
      showLocation: true,
      email: profile.email,
      links: { github: profile.links.github, linkedin: profile.links.linkedin, leetcode: profile.links.leetcode, others: [] },
      availability: { available: true, label: profile.availability },
      hero: { roles: [...profile.roles], description: profile.summary },
      about: {
        heading: about.heading,
        lead: about.lead,
        paragraphs: [...about.paragraphs],
        principles: about.principles.map((x) => ({ title: x.title, text: x.text })),
        facts: about.facts.map((f) => ({ ...f })),
      },
      exploring: exploring.map((e) => ({ ...e })),
    },
    projects: buildProjects(),
    skillCategories: skillCategories.map((name) => ({ id: slugify(name), name, color: CATEGORY_COLORS[name] ?? '#8B5CF6' })),
    skills: skills.map((s, i) => ({
      id: `skill-${i}`,
      name: s.name,
      category: s.category,
      categoryColor: CATEGORY_COLORS[s.category] ?? '#8B5CF6',
      note: s.note,
      related: s.links ?? [],
      featured: false,
      proficiency: null,
      icon: null,
    })),
    ...buildTimeline(),
    education: [
      {
        id: 'edu0',
        // The seed stores the bare institution; the site has always shown the city too.
        institution: profile.education.school,
        degree: 'B.E.',
        field: 'Computer Science (Internet of Things)',
        startYear: null,
        graduationYear: 2027,
        grade: 'CGPA 7.8 / 10',
        description: profile.education.detail,
        achievements: [],
        visible: true,
      },
    ],
    homepage: {
      sections: [
        { type: 'hero', enabled: true, eyebrow: '', heading: '', description: '', background: 'default', spacing: 'normal' },
        { type: 'about', enabled: true, eyebrow: 'Identity', heading: about.heading, description: '', background: 'default', spacing: 'normal' },
        { type: 'projects', enabled: true, eyebrow: 'Selected work', heading: "Things I've engineered.", description: '', background: 'default', spacing: 'normal' },
        { type: 'lab', enabled: true, eyebrow: 'Engineering', heading: 'Inside My Engineering Lab.', description: '', background: 'default', spacing: 'normal' },
        { type: 'skills', enabled: true, eyebrow: 'Skills', heading: 'A constellation of tools.', description: '', background: 'default', spacing: 'normal' },
        { type: 'experience', enabled: true, eyebrow: 'Experience', heading: 'Milestones, so far.', description: '', background: 'default', spacing: 'normal' },
        { type: 'education', enabled: false, eyebrow: 'Education', heading: 'Education.', description: '', background: 'default', spacing: 'normal' },
        { type: 'achievements', enabled: false, eyebrow: 'Achievements', heading: 'Achievements.', description: '', background: 'default', spacing: 'normal' },
        { type: 'exploring', enabled: true, eyebrow: 'Now', heading: 'Currently Exploring.', description: '', background: 'default', spacing: 'normal' },
        { type: 'contact', enabled: true, eyebrow: 'Contact', heading: 'Have an interesting problem to solve?', description: '', background: 'default', spacing: 'normal' },
        { type: 'footer', enabled: true, eyebrow: '', heading: '', description: '', background: 'default', spacing: 'normal' },
      ],
      featuredProjectIds: [],
      showArchive: true,
    },
    appearance: DEFAULT_APPEARANCE,
    seo: {
      siteUrl,
      title: 'Parthiban Gunasekaran — Software Engineer',
      // Same copy as the static <meta> in index.html.
      description:
        'Parthiban Gunasekaran — full-stack software engineer building intelligent applications, scalable real-time systems and products people use. Currently shipping NexaRide at Dendo.',
      ogTitle: 'Parthiban Gunasekaran — Software Engineer',
      ogDescription: 'Engineering the future, one idea at a time. Projects, engineering lab and experience.',
      ogImage: null,
      canonicalUrl: siteUrl,
      robotsIndex: true,
      robotsFollow: true,
      twitterCard: 'summary_large_image',
      structuredData: true,
    },
  }
  return cached
}
