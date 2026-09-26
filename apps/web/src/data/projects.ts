// Project content. Featured projects get a cinematic showcase and a detail
// modal; archive projects render as a compact index. Add new entries here.

export type PreviewKind = 'mobility' | 'delivery' | 'security' | 'vision'
export type FeatureStatus = 'shipped' | 'in-progress' | 'proposed'

export interface ProjectLink {
  label: string
  href: string
}

export interface FeaturedProject {
  id: string
  index: string
  title: string
  fullTitle?: string
  category: string
  status: string
  description: string
  preview: PreviewKind
  accent: string
  tech: string[]
  features: { text: string; status: FeatureStatus }[]
  architecture: { layer: string; detail: string }[]
  challenges: { title: string; text: string }[]
  links: ProjectLink[]
  note?: string
}

export interface ArchiveProject {
  title: string
  kind: string
  description: string
  tech: string[]
  links: ProjectLink[]
  note?: string
}

export const featuredProjects: FeaturedProject[] = [
  {
    id: 'nexaride',
    index: '01',
    title: 'NexaRide',
    category: 'Ride-Hailing Platform · Full-Stack Development',
    status: 'Live on Google Play & App Store',
    description:
      'A modern ride-hailing and parcel delivery platform designed to connect passengers, drivers, and delivery services through a unified digital experience.',
    preview: 'mobility',
    accent: '#00E5FF',
    tech: ['React Native', 'NestJS', 'PostgreSQL + PostGIS', 'Prisma', 'Socket.IO', 'Redis', 'Next.js', 'Google Maps API', 'Docker', 'Terraform'],
    features: [
      { text: 'Real-time driver tracking over WebSockets', status: 'shipped' },
      { text: 'Zone-based, distance-band dispatch and driver–passenger matching', status: 'shipped' },
      { text: 'Live ride status, offers and ETA updates', status: 'shipped' },
      { text: 'Route and ETA integration with Google Maps', status: 'shipped' },
      { text: 'Parcel delivery workflows', status: 'shipped' },
      { text: 'Next.js admin and operations console', status: 'shipped' },
    ],
    architecture: [
      { layer: 'Clients', detail: 'Rider and driver apps in React Native, plus a Next.js operations console — all sharing a typed @nexaride/shared contract package.' },
      { layer: 'API', detail: '48-module NestJS backend: 34 controllers, 55 services, 368 REST endpoints, JWT auth with role-based access.' },
      { layer: 'Real-time', detail: 'Socket.IO gateway with a Redis pub/sub adapter, so any node can serve any client without sticky sessions.' },
      { layer: 'Data', detail: '77-model PostgreSQL schema through Prisma, PostGIS for geospatial queries.' },
      { layer: 'Delivery', detail: 'Docker images on Terraform-provisioned infrastructure, zero-downtime deploys gated on a boot health check.' },
    ],
    challenges: [
      { title: 'Matching latency', text: 'Replaced one-driver-at-a-time assignment with zone-based distance-band broadcast matching, so nearby drivers get the offer in parallel.' },
      { title: 'Concurrent assignment', text: 'Two drivers can accept the same ride at once — transactional, idempotent writes guarantee exactly one wins.' },
      { title: 'Silent failures', text: 'Added error boundaries and crash reporting that surfaced a class of client failures no existing signal had caught.' },
    ],
    links: [
      { label: 'Website', href: 'https://nexaride.in' },
      { label: 'Google Play', href: 'https://play.google.com/store/apps/details?id=com.nexaride.userapp' },
      { label: 'App Store', href: 'https://apps.apple.com/app/id6791447323' },
    ],
    note: 'Built at Dendo as part of the engineering team. Source is proprietary.',
  },
  {
    id: 'dendo',
    index: '02',
    title: 'Dendo',
    category: 'Hyperlocal Food & Delivery · Product Development',
    status: 'In development',
    description:
      'A food delivery platform designed to simplify the ordering experience while connecting customers, restaurants, and delivery partners.',
    preview: 'delivery',
    accent: '#FF9F43',
    tech: ['React Native', 'TypeScript', 'Express', 'Socket.IO', 'PostgreSQL', 'Redis', 'Google Maps', 'Cashfree'],
    features: [
      { text: 'Customer, vendor and rider apps from one monorepo', status: 'in-progress' },
      { text: 'Live order tracking over Socket.IO', status: 'in-progress' },
      { text: 'Restaurant order tray and menu management', status: 'in-progress' },
      { text: 'Cashfree payments and cash-on-delivery collection', status: 'in-progress' },
    ],
    architecture: [
      { layer: 'Clients', detail: 'Customer, rider and vendor apps in React Native with Redux Toolkit; a Vite + React admin panel.' },
      { layer: 'API', detail: 'Node 20 + Express + TypeScript, with Zod validation shared across apps.' },
      { layer: 'Real-time', detail: 'Socket.IO with a Redis adapter for order and rider location events.' },
      { layer: 'Data', detail: 'PostgreSQL 16 and Redis 7; shared domain types as the single source of truth.' },
    ],
    challenges: [
      { title: 'Three-sided marketplace', text: 'Customers, restaurants and riders each need their own app and their own view of the same order lifecycle.' },
      { title: 'One contract, many clients', text: 'A pnpm + Turborepo monorepo of shared types, constants and validation keeps every app in sync.' },
    ],
    links: [],
    note: 'Built at Dendo. Source is proprietary; screenshots to be added.',
  },
  {
    id: 'blockspy',
    index: '03',
    title: 'BlockSpy',
    category: 'AI · Blockchain Security',
    status: 'Concept · CodeClass 2.0 Round 2',
    description:
      'An AI-powered crypto intelligence concept designed to identify suspicious blockchain activity and help users understand potential risks.',
    preview: 'security',
    accent: '#FF4D6D',
    tech: ['Artificial Intelligence', 'Blockchain', 'Data analysis'],
    features: [
      { text: 'Flag suspicious wallet and transaction patterns', status: 'proposed' },
      { text: 'Explain risk to users in plain language with an AI model', status: 'proposed' },
      { text: 'Visualise transaction paths between wallets', status: 'proposed' },
    ],
    architecture: [
      { layer: 'Ingest', detail: 'Proposed: read on-chain transactions and approvals through RPC providers.' },
      { layer: 'Analyse', detail: 'Proposed: heuristics plus an AI model score wallets and transfers for risk.' },
      { layer: 'Explain', detail: 'Proposed: a dashboard that turns scores into readable risk explanations.' },
    ],
    challenges: [
      { title: 'Signal vs. noise', text: 'Most on-chain activity is benign; the design has to surface real risk without drowning users in alerts.' },
    ],
    links: [],
    note: 'Selected for Round 2 of CodeClass 2.0. Features shown are proposed, not yet implemented.',
  },
  {
    id: 'walnut',
    index: '04',
    title: 'Walnut AI',
    fullTitle: 'Automated Walnut Quality and Aflatoxin Risk Detection System Using UV Imaging and AI-Based Analysis',
    category: 'Computer Vision · Artificial Intelligence · IoT',
    status: 'Research · paper under peer review',
    description:
      'An intelligent quality-assessment system that combines UV imaging, computer vision, and embedded technology to support walnut quality analysis and aflatoxin risk assessment.',
    preview: 'vision',
    accent: '#B388FF',
    tech: ['Python', 'YOLOv8', 'Computer Vision', 'UV Imaging', 'ESP32', 'IoT'],
    features: [
      { text: 'Real-time analysis of a UV image stream', status: 'shipped' },
      { text: 'Quality-grade classification of walnuts', status: 'shipped' },
      { text: 'Hardware actuation to separate graded nuts', status: 'shipped' },
      { text: 'Aflatoxin risk indication from UV fluorescence cues', status: 'in-progress' },
    ],
    architecture: [
      { layer: 'Capture', detail: 'UV illumination and camera capture walnuts on the line.' },
      { layer: 'Inference', detail: 'YOLOv8-based detection and grading in Python.' },
      { layer: 'Control', detail: 'ESP32 drives an actuator to route each nut by grade.' },
      { layer: 'Monitor', detail: 'Device status and grading results for the operator.' },
    ],
    challenges: [
      { title: 'Honest claims', text: 'UV fluorescence is a risk indicator, not a lab test — the system supports aflatoxin risk assessment rather than confirming contamination.' },
      { title: 'Real-time on the edge', text: 'Inference has to keep up with a moving line on modest embedded hardware.' },
    ],
    links: [],
    note: 'Research paper under peer review.',
  },
]

export const archiveProjects: ArchiveProject[] = [
  {
    title: 'TrustLance',
    kind: 'Web3 · Hackathon winner',
    description: 'Trust-first freelance marketplace with milestone escrow, wallet-linked identity and XMTP encrypted messaging.',
    tech: ['TypeScript', 'React', 'Node.js', 'Solidity'],
    links: [{ label: 'Code', href: 'https://github.com/TheParthi/TRTLance' }],
    note: 'Team project',
  },
  {
    title: 'Loanify',
    kind: 'AI agents · Fintech',
    description: 'Multi-agent NBFC loan automation: KYC, underwriting and sanction-letter agents with an admin dashboard.',
    tech: ['Next.js', 'Express', 'SQLite'],
    links: [{ label: 'Code', href: 'https://github.com/TheParthi/Loanify' }],
  },
  {
    title: 'Customer Support Email Automation',
    kind: 'AI agents · RAG',
    description: 'LangGraph agents that triage a Gmail inbox, draft replies and answer product questions with RAG.',
    tech: ['Python', 'LangGraph', 'Gmail API'],
    links: [{ label: 'Code', href: 'https://github.com/TheParthi/Email_rag' }],
  },
  {
    title: 'Malware Detection & Threat Response',
    kind: 'Security · GenAI',
    description: 'Static analysis, GenAI malware classification and SOAR-style automated response in a Streamlit UI.',
    tech: ['Python', 'Streamlit'],
    links: [{ label: 'Code', href: 'https://github.com/TheParthi/Malware-Detection-GenAI' }],
  },
  {
    title: 'Blockchain Security Monitor',
    kind: 'Web3 security · LLMs',
    description: 'Monitors ERC-20 allowances, flags risky approvals and explains the risk with an LLM.',
    tech: ['Python', 'Ethereum RPC'],
    links: [{ label: 'Code', href: 'https://github.com/TheParthi/Security_monitor' }],
  },
  {
    title: 'DocVault',
    kind: 'Full stack · Real-time',
    description: 'Bulk PDF upload with per-file progress and live Socket.IO notifications.',
    tech: ['React', 'Express', 'MySQL', 'Socket.IO'],
    links: [{ label: 'Code', href: 'https://github.com/TheParthi/Digi_doc' }],
  },
  {
    title: 'Real-Time Sign Language Interpreter',
    kind: 'Accessibility · Vision',
    description: 'Browser-based ASL interpreter with MediaPipe hand, face and pose tracking plus speech output.',
    tech: ['JavaScript', 'MediaPipe'],
    links: [
      { label: 'Live', href: 'https://sign-interpreter-five.vercel.app' },
      { label: 'Code', href: 'https://github.com/TheParthi/Sign_Language' },
    ],
    note: 'RAISE-26 · team project',
  },
  {
    title: 'BNB Chain AI Toolkit',
    kind: 'Web3 · AI tooling',
    description: 'MCP servers and agents that give AI assistants direct access to BNB Chain.',
    tech: ['TypeScript', 'MCP'],
    links: [
      { label: 'Live', href: 'https://chain-tool-kit.vercel.app' },
      { label: 'Code', href: 'https://github.com/TheParthi/chain_tool_kit' },
    ],
  },
  {
    title: 'Edge-IoT Emergency Lane Clearance',
    kind: 'Embedded · Published research',
    description: 'Edge device that detects emergency vehicles using thermal and humidity-aware vision.',
    tech: ['Embedded', 'Thermal sensing', 'Vision'],
    links: [],
    note: 'Published research',
  },
]
