export interface Skill {
  name: string
  category: SkillCategory
  note: string
  /** Names of related skills; drawn as links in the constellation. */
  links?: string[]
}

export const skillCategories = [
  'Programming',
  'Frontend',
  'Backend',
  'Databases',
  'Mobile',
  'Tools & Platforms',
] as const
export type SkillCategory = (typeof skillCategories)[number]

export const skills: Skill[] = [
  { name: 'Java', category: 'Programming', note: '600+ LeetCode problems; Spring Boot services.', links: ['Spring Boot', 'Hibernate'] },
  { name: 'C', category: 'Programming', note: 'Systems fundamentals and embedded work.', links: ['C++'] },
  { name: 'C++', category: 'Programming', note: 'Data structures and algorithms.' },
  { name: 'Python', category: 'Programming', note: 'Computer vision, AI agents and automation.' },
  { name: 'JavaScript', category: 'Programming', note: 'Across web, Node.js and mobile.', links: ['TypeScript', 'Node.js', 'React'] },
  { name: 'TypeScript', category: 'Programming', note: 'Strict TS across NexaRide backend and apps.', links: ['NestJS', 'React', 'React Native'] },

  { name: 'React', category: 'Frontend', note: 'Web consoles and dashboards.', links: ['Tailwind CSS', 'React Native'] },
  { name: 'HTML', category: 'Frontend', note: 'Semantic, accessible markup.', links: ['CSS'] },
  { name: 'CSS', category: 'Frontend', note: 'Layout, motion and responsive design.', links: ['Tailwind CSS'] },
  { name: 'Tailwind CSS', category: 'Frontend', note: 'Utility-first styling and design tokens.' },

  { name: 'Spring Boot', category: 'Backend', note: 'Concurrent booking services at Pinnacle Labs.', links: ['JPA', 'MySQL'] },
  { name: 'NestJS', category: 'Backend', note: '48-module NexaRide backend.', links: ['Prisma', 'PostgreSQL', 'REST APIs'] },
  { name: 'Node.js', category: 'Backend', note: 'APIs, real-time gateways and tooling.', links: ['NestJS', 'REST APIs', 'Socket.IO'] },
  { name: 'REST APIs', category: 'Backend', note: '368 endpoints designed and maintained.', links: ['Swagger', 'Postman'] },
  { name: 'Socket.IO', category: 'Backend', note: 'Live ride and order tracking with Redis pub/sub.', links: ['Redis'] },

  { name: 'MySQL', category: 'Databases', note: 'Composite indexes cut API latency ~40%.' },
  { name: 'PostgreSQL', category: 'Databases', note: '77-model schema with PostGIS.', links: ['Prisma'] },
  { name: 'Redis', category: 'Databases', note: 'Pub/sub fan-out and caching.' },
  { name: 'Prisma', category: 'Databases', note: 'Typed ORM and migrations.' },
  { name: 'Hibernate', category: 'Databases', note: 'ORM for Spring services.', links: ['JPA'] },
  { name: 'JPA', category: 'Databases', note: 'Transactional writes under concurrency.', links: ['MySQL'] },

  { name: 'React Native', category: 'Mobile', note: 'NexaRide rider and driver apps.' },
  { name: 'Flutter', category: 'Mobile', note: 'Cross-platform mobile UI.', links: ['Dart'] },
  { name: 'Dart', category: 'Mobile', note: 'Language behind Flutter apps.' },

  { name: 'Git', category: 'Tools & Platforms', note: 'PR-based workflow with code review.', links: ['GitHub'] },
  { name: 'GitHub', category: 'Tools & Platforms', note: 'Actions CI gating lint, types and tests.' },
  { name: 'Postman', category: 'Tools & Platforms', note: 'API exploration and testing.' },
  { name: 'Swagger', category: 'Tools & Platforms', note: 'OpenAPI documentation.' },
  { name: 'Docker', category: 'Tools & Platforms', note: 'Containerised services.', links: ['AWS'] },
  { name: 'AWS', category: 'Tools & Platforms', note: 'EC2, RDS and S3.' },
  { name: 'Microsoft Azure', category: 'Tools & Platforms', note: 'Cloud fundamentals.' },
]
