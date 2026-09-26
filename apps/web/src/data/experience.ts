// Timeline entries. `kind` controls the badge so participation, selection,
// wins and certifications are never confused. Set `hidden: true` to keep an
// entry in the data without showing it (for example, until it is verified).

export type MilestoneKind =
  | 'Internship'
  | 'Winner'
  | 'Selected'
  | 'Participated'
  | 'Certified'
  | 'Research'

export interface Milestone {
  date: string
  title: string
  org: string
  kind: MilestoneKind
  detail: string
  points?: string[]
  meta?: string[]
  hidden?: boolean
}

export const milestones: Milestone[] = [
  {
    date: 'Aug 2026 — Present',
    title: 'Software Engineer Intern',
    org: 'Dendo',
    kind: 'Internship',
    detail: 'NexaRide ride-hailing platform and the Dendo delivery app.',
    points: [
      'Ship features on a 48-module NestJS backend — 368 REST endpoints over a 77-model PostgreSQL schema.',
      'Replaced sequential driver assignment with zone-based distance-band broadcast matching.',
      'Added error boundaries and crash reporting that surfaced previously silent client failures.',
      'Contribute to 46 Jest and Supertest suites and a CI pipeline gating every change.',
    ],
    meta: ['TypeScript', 'NestJS', 'PostGIS', 'Redis', 'React Native'],
  },
  {
    date: '2026',
    title: 'HackSprint 2026',
    org: 'iamneo / NIIT Venture',
    kind: 'Winner',
    detail: 'Winning team.',
  },
  {
    date: '',
    title: 'GDG KSR Web3 Hackathon',
    org: 'Shardeum',
    kind: 'Winner',
    detail: 'Won with TrustLance, a trust-first freelance marketplace.',
  },
  {
    date: '',
    title: 'CodeClass 2.0',
    org: 'BlockSpy',
    kind: 'Selected',
    detail: 'BlockSpy project selected for Round 2.',
  },
  {
    date: '2025',
    title: 'FinArva AI Hackathon 2025',
    org: 'FinArva',
    kind: 'Participated',
    detail: 'Participated in the competition.',
  },
  {
    date: '2025',
    title: 'Pivot Challenge 2025',
    org: 'Bharati Vidyapeeth',
    kind: 'Winner',
    detail: 'Winning team.',
  },
  {
    date: 'Jun 2025 — Sep 2025',
    title: 'Java Developer Intern',
    org: 'Pinnacle Labs Pvt Ltd',
    kind: 'Internship',
    detail: 'Real-time seat availability and booking.',
    points: [
      'Built 5 concurrent Spring Boot REST services with JPA and Hibernate over MySQL.',
      'Traced slow responses to 4 inefficient SQL joins; composite indexes cut latency about 40%.',
    ],
    meta: ['Java', 'Spring Boot', 'MySQL'],
  },
  {
    date: 'Ongoing',
    title: 'Walnut AI & Edge-IoT research',
    org: 'Research projects',
    kind: 'Research',
    detail: 'Edge-IoT emergency lane clearance — published. Walnut quality detection — under peer review.',
  },
  {
    date: '',
    title: 'Cisco CCNA',
    org: 'Cisco',
    kind: 'Certified',
    detail: 'Switching, routing and enterprise networking.',
  },
  {
    date: '',
    title: 'Oracle Cloud AI Foundations',
    org: 'Oracle',
    kind: 'Certified',
    detail: 'AI and ML fundamentals on Oracle Cloud.',
  },
  {
    // Hidden until the certification status is confirmed.
    date: '',
    title: 'AZ-900 Microsoft Azure Fundamentals',
    org: 'Microsoft',
    kind: 'Certified',
    detail: 'Cloud concepts, Azure services, security and governance.',
    hidden: true,
  },
]
