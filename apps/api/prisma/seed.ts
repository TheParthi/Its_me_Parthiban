/**
 * Seeds roles/permissions (always, idempotent) and — only when the database
 * has no content yet — imports the portfolio's current content from
 * apps/web/src/data as the initial published version.
 *
 *   npm run seed              # roles + first-time content import
 *   npm run seed -- --force   # re-import content, replacing existing content
 */
import { PrismaClient, Prisma } from '@prisma/client'
import {
  DEFAULT_APPEARANCE,
  DEFAULT_SETTINGS,
  PERMISSIONS,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  ROLES,
  appearanceSchema,
  homepageSchema,
  profileSchema,
  projectInputSchema,
  seoSchema,
  skillInputSchema,
  experienceInputSchema,
  educationInputSchema,
  certificationInputSchema,
  achievementInputSchema,
  type HomepageConfig,
} from '@pg/shared'
import { about, exploring, profile } from '../../web/src/data/profile'
import { archiveProjects, featuredProjects } from '../../web/src/data/projects'
import { skillCategories, skills } from '../../web/src/data/skills'
import { milestones } from '../../web/src/data/experience'

const prisma = new PrismaClient()
const json = (v: unknown) => v as Prisma.InputJsonValue
const now = new Date()

const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  'content:read': 'Read drafts of all portfolio content',
  'content:write': 'Create and edit drafts',
  'content:publish': 'Publish, unpublish, schedule and restore versions',
  'content:delete': 'Move content to trash and delete it',
  'media:read': 'Browse the media library',
  'media:write': 'Upload and edit media',
  'media:delete': 'Delete media',
  'site:write': 'Edit homepage layout, appearance and SEO',
  'analytics:read': 'View aggregated analytics',
  'analytics:sessions': 'Inspect anonymous sessions and live visitors',
  'messages:read': 'Read contact messages',
  'messages:write': 'Change message status, export, delete',
  'users:read': 'View administrators',
  'users:write': 'Invite, change roles, disable and remove administrators',
  'security:read': 'View security activity and sessions',
  'security:write': 'Revoke sessions and change security policy',
  'audit:read': 'Read the audit log',
  'settings:read': 'View settings',
  'settings:write': 'Change settings',
  'backup:export': 'Export portfolio content',
  'backup:restore': 'Restore content from a backup',
}

async function seedRoles() {
  for (const key of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      create: { key, description: PERMISSION_DESCRIPTIONS[key] ?? '' },
      update: { description: PERMISSION_DESCRIPTIONS[key] ?? '' },
    })
  }
  const perms = await prisma.permission.findMany()
  for (const name of ROLES) {
    const role = await prisma.role.upsert({ where: { name }, create: { name, label: ROLE_LABELS[name] }, update: { label: ROLE_LABELS[name] } })
    const wanted = perms.filter((p) => (ROLE_PERMISSIONS[name] as readonly string[]).includes(p.key))
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } })
    await prisma.rolePermission.createMany({ data: wanted.map((p) => ({ roleId: role.id, permissionId: p.id })) })
  }
  console.log(`✓ ${ROLES.length} roles, ${PERMISSIONS.length} permissions`)
}

async function publishedDoc(key: 'PROFILE' | 'HOMEPAGE' | 'APPEARANCE' | 'SEO' | 'SETTINGS', data: unknown) {
  await prisma.siteDocument.upsert({
    where: { key },
    create: { key, draft: json(data), published: json(data), status: 'PUBLISHED', publishedAt: now },
    update: { draft: json(data), published: json(data), status: 'PUBLISHED', publishedAt: now },
  })
  await prisma.contentVersion.create({ data: { entityType: key.toLowerCase(), entityId: key, version: 1, action: 'import', snapshot: json(data) } })
}

async function seedContent() {
  // Profile
  const p = profileSchema.parse({
    fullName: profile.name,
    firstName: profile.firstName,
    initials: profile.initials,
    title: 'Software Engineer',
    tagline: profile.tagline,
    shortBio: profile.summary,
    longBio: about.lead,
    photoId: null,
    coverId: null,
    resumeId: null,
    location: profile.location,
    showLocation: true,
    email: profile.email,
    links: { github: profile.links.github, linkedin: profile.links.linkedin, leetcode: profile.links.leetcode, others: [] },
    availability: { available: true, label: profile.availability },
    hero: { roles: profile.roles, description: profile.summary },
    about: {
      heading: about.heading,
      lead: about.lead,
      paragraphs: about.paragraphs,
      principles: about.principles.map((x) => ({ title: x.title, text: x.text })),
      facts: about.facts,
    },
    exploring,
  })
  await publishedDoc('PROFILE', p)

  // Projects
  let order = 0
  for (const fp of featuredProjects) {
    const input = projectInputSchema.parse({
      title: fp.title,
      slug: fp.id,
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
    })
    await createProject(input, order++)
  }
  for (const ap of archiveProjects) {
    const slug = ap.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const repo = ap.links.find((l) => l.label === 'Code')?.href ?? ''
    const demo = ap.links.find((l) => l.label === 'Live')?.href ?? ''
    const input = projectInputSchema.parse({
      title: ap.title,
      slug,
      category: ap.kind,
      shortDescription: ap.description,
      description: ap.description,
      previewStyle: 'image',
      repoUrl: repo,
      demoUrl: demo,
      links: ap.links,
      technologies: ap.tech,
      note: ap.note ?? '',
      featured: false,
    })
    await createProject(input, order++)
  }

  // Skills
  const palette: Record<string, string> = {
    Programming: '#8B5CF6',
    Frontend: '#00E5FF',
    Backend: '#34D399',
    Databases: '#FFD166',
    Mobile: '#FF9F43',
    'Tools & Platforms': '#F472B6',
  }
  const cats: Record<string, string> = {}
  for (const [i, name] of skillCategories.entries()) {
    const c = await prisma.skillCategory.create({ data: { name, color: palette[name] ?? '#8B5CF6', order: i } })
    cats[name] = c.id
  }
  for (const [i, s] of skills.entries()) {
    const d = skillInputSchema.parse({ name: s.name, categoryId: cats[s.category], note: s.note, related: s.links ?? [] })
    await prisma.skill.create({ data: { name: d.name, categoryId: d.categoryId, order: i, status: 'PUBLISHED', draft: json(d), published: json(d), publishedAt: now } })
  }

  // Timeline → experience / achievements / certifications
  const monthMap: Record<string, string> = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' }
  const ym = (s: string | undefined) => {
    const m = s?.match(/([A-Z][a-z]{2}) (\d{4})/)
    return m ? `${m[2]}-${monthMap[m[1]]}` : null
  }
  let e = 0, a = 0, c = 0
  for (const m of milestones) {
    if (m.kind === 'Internship') {
      const [start, end] = m.date.split('—').map((x) => x.trim())
      const d = experienceInputSchema.parse({
        position: m.title,
        organization: m.org,
        employmentType: 'Internship',
        startDate: ym(start),
        endDate: /present/i.test(end ?? '') ? null : ym(end),
        current: /present/i.test(end ?? ''),
        description: m.detail,
        responsibilities: m.points ?? [],
        technologies: m.meta ?? [],
      })
      await prisma.experience.create({ data: { order: e++, status: 'PUBLISHED', draft: json(d), published: json(d), publishedAt: now } })
    } else if (m.kind === 'Certified') {
      const d = certificationInputSchema.parse({ name: m.title, issuer: m.org, description: m.detail })
      // Hidden entries stay as unpublished drafts until verified.
      await prisma.certification.create({
        data: { order: c++, status: m.hidden ? 'DRAFT' : 'PUBLISHED', draft: json(d), published: m.hidden ? undefined : json(d), publishedAt: m.hidden ? null : now },
      })
    } else {
      const year = m.date.match(/\d{4}/)?.[0]
      const d = achievementInputSchema.parse({
        title: m.title,
        kind: m.kind,
        event: m.org,
        date: year ? `${year}-01` : null,
        description: m.detail,
      })
      await prisma.achievement.create({ data: { order: a++, status: 'PUBLISHED', draft: json(d), published: json(d), publishedAt: now } })
    }
  }

  const edu = educationInputSchema.parse({
    institution: 'Sri Krishna College of Technology',
    degree: 'B.E.',
    field: 'Computer Science (Internet of Things)',
    graduationYear: 2027,
    grade: 'CGPA 7.8 / 10',
    description: profile.education.detail,
  })
  await prisma.education.create({ data: { order: 0, status: 'PUBLISHED', draft: json(edu), published: json(edu), publishedAt: now } })

  const homepage: HomepageConfig = homepageSchema.parse({
    sections: [
      { type: 'hero', enabled: true },
      { type: 'about', enabled: true, eyebrow: 'Identity', heading: about.heading },
      { type: 'projects', enabled: true, eyebrow: 'Selected work', heading: "Things I've engineered." },
      { type: 'lab', enabled: true, eyebrow: 'Engineering', heading: 'Inside My Engineering Lab.' },
      { type: 'skills', enabled: true, eyebrow: 'Skills', heading: 'A constellation of tools.' },
      { type: 'experience', enabled: true, eyebrow: 'Experience', heading: 'Milestones, so far.' },
      { type: 'education', enabled: false, eyebrow: 'Education', heading: 'Education.' },
      { type: 'achievements', enabled: false, eyebrow: 'Achievements', heading: 'Achievements.' },
      { type: 'exploring', enabled: true, eyebrow: 'Now', heading: 'Currently Exploring.' },
      { type: 'contact', enabled: true, eyebrow: 'Contact', heading: 'Have an interesting problem to solve?' },
      { type: 'footer', enabled: true },
    ],
    featuredProjectIds: [],
    showArchive: true,
  })
  await publishedDoc('HOMEPAGE', homepage)
  await publishedDoc('APPEARANCE', appearanceSchema.parse(DEFAULT_APPEARANCE))
  await publishedDoc(
    'SEO',
    seoSchema.parse({
      siteUrl: process.env.PUBLIC_SITE_URL ?? 'https://theparthi.github.io/Its_me_Parthiban/',
      title: 'Parthiban Gunasekaran — Software Engineer',
      description:
        'Parthiban Gunasekaran — full-stack software engineer building intelligent applications, scalable real-time systems and products people use.',
      ogTitle: 'Parthiban Gunasekaran — Software Engineer',
      ogDescription: 'Engineering the future, one idea at a time. Projects, engineering lab and experience.',
      ogImageId: null,
      canonicalUrl: process.env.PUBLIC_SITE_URL ?? 'https://theparthi.github.io/Its_me_Parthiban/',
      robotsIndex: true,
      robotsFollow: true,
      twitterCard: 'summary_large_image',
      structuredData: true,
    }),
  )
  await prisma.siteDocument.upsert({
    where: { key: 'SETTINGS' },
    create: { key: 'SETTINGS', draft: json(DEFAULT_SETTINGS), published: json(DEFAULT_SETTINGS), status: 'PUBLISHED', publishedAt: now },
    update: {},
  })
  console.log(`✓ content imported: ${featuredProjects.length + archiveProjects.length} projects, ${skills.length} skills, ${e} experience, ${a} achievements, ${c} certifications`)
}

async function createProject(input: ReturnType<typeof projectInputSchema.parse>, order: number) {
  await prisma.project.create({
    data: {
      slug: input.slug,
      title: input.title,
      order,
      featured: input.featured,
      status: 'PUBLISHED',
      draft: json(input),
      published: json(input),
      publishedAt: now,
      technologies: { create: input.technologies.map((name, i) => ({ name, order: i })) },
    },
  })
}

async function wipeContent() {
  await prisma.$transaction([
    prisma.contentVersion.deleteMany(),
    prisma.projectTechnology.deleteMany(),
    prisma.project.deleteMany(),
    prisma.skill.deleteMany(),
    prisma.skillCategory.deleteMany(),
    prisma.experience.deleteMany(),
    prisma.education.deleteMany(),
    prisma.certification.deleteMany(),
    prisma.achievement.deleteMany(),
    prisma.siteDocument.deleteMany({ where: { key: { not: 'SETTINGS' } } }),
  ])
}

async function main() {
  await seedRoles()
  const force = process.argv.includes('--force')
  const hasContent = (await prisma.siteDocument.count({ where: { key: 'PROFILE' } })) > 0
  if (hasContent && !force) {
    console.log('• content already present — skipped (use --force to re-import)')
    return
  }
  if (force) await wipeContent()
  await seedContent()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
