// Project content. Featured projects get a cinematic showcase and a detail
// modal; archive projects render as a compact index. Add new entries here.

export type PreviewKind = 'mobility' | 'delivery' | 'security' | 'vision' | 'image'
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
  /** Image under public/ used as the preview when `preview` is 'image'. */
  cover?: { file: string; alt: string; width: number; height: number }
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
      { label: 'Driver app', href: 'https://play.google.com/store/apps/details?id=com.nexadriver' },
    ],
    note: 'Built at Dendo as part of the engineering team. Source is proprietary; screenshots are from the public store listings.',
  },
  {
    id: 'dendo',
    index: '02',
    title: 'Dendo',
    category: 'Hyperlocal Food & Parcel Delivery · Mobile + Backend',
    status: 'Live on Google Play · 3 apps',
    description:
      'A hyperlocal food and parcel delivery platform: a customer app, a rider app and a restaurant partner app, run from one admin panel.',
    preview: 'image',
    cover: { file: 'work/dendo/customer/cover.webp', alt: 'Dendo customer app — home screen with categories and restaurants', width: 1600, height: 1040 },
    accent: '#3B6CF6',
    tech: ['Flutter', 'Dart', 'GetX', 'Laravel 12', 'PHP 8.2', 'MySQL', 'Laravel Passport', 'Pusher', 'Firebase Cloud Messaging', 'Google Maps', 'Razorpay', 'AWS'],
    features: [
      { text: 'Customer app: restaurants, menus, cart, offers and checkout', status: 'shipped' },
      { text: 'Parcel delivery alongside food ordering', status: 'shipped' },
      { text: 'Live order and rider tracking on the map', status: 'shipped' },
      { text: 'Rider app: go online, accept orders, earnings and incentives', status: 'shipped' },
      { text: 'Restaurant app: order alerts, menu and item availability, wallet', status: 'shipped' },
      { text: 'Admin panel controlling pricing, zones and app content', status: 'shipped' },
    ],
    architecture: [
      { layer: 'Clients', detail: 'Three Flutter apps (customer, rider, restaurant partner) using GetX for state and routing.' },
      { layer: 'API', detail: 'Laravel 12 REST API on PHP 8.2 with Passport auth; the same codebase serves the admin panel.' },
      { layer: 'Real-time', detail: 'Pusher channels for live order status and parcel tracking; Firebase Cloud Messaging for push alerts.' },
      { layer: 'Data', detail: 'MySQL for orders, menus, zones and wallets; Google Maps for geocoding, places and routes via the backend.' },
      { layer: 'Delivery', detail: 'Containerised backend on AWS; apps released to Google Play with staged builds.' },
    ],
    challenges: [
      { title: 'Three-sided marketplace', text: 'Customers, restaurants and riders each need their own app and their own view of the same order lifecycle.' },
      { title: 'Food and parcels in one app', text: 'Two businesses with different flows, pricing and payment rules share one customer app without blurring together.' },
      { title: 'Admin-controlled behaviour', text: 'Pricing, delivery charges and app content come from admin settings, so every change has to be traced from the panel through the API to each app.' },
    ],
    links: [
      { label: 'Google Play', href: 'https://play.google.com/store/apps/details?id=com.dendo.update.user' },
      { label: 'Rider app', href: 'https://play.google.com/store/apps/details?id=com.dendo.update.delivery' },
      { label: 'Restaurant app', href: 'https://play.google.com/store/apps/details?id=com.dendo.update.store' },
    ],
    note: 'Built at Dendo as part of the engineering team. Source is proprietary; screenshots are from the public Google Play listings.',
  },
  {
    id: 'trustlance',
    index: '03',
    title: 'TrustLance',
    category: 'Freelance Marketplace · Full-Stack Web',
    status: 'Hackathon winner · rebuilt as v2',
    description:
      'A freelance marketplace where every contract is funded in escrow before work begins, and every milestone is paid the moment it is approved.',
    preview: 'image',
    cover: { file: 'work/trustlance/cover.webp', alt: 'TrustLance landing page with the 3D escrow ring', width: 1600, height: 1040 },
    accent: '#2DE38E',
    tech: ['Next.js 15', 'React 19', 'TypeScript', 'Tailwind CSS', 'Supabase', 'PostgreSQL', 'Three.js', 'Genkit + Gemini', 'Razorpay', 'Playwright', 'Vitest'],
    features: [
      { text: 'Projects, proposals, contracts and signed terms', status: 'shipped' },
      { text: 'Escrow-funded milestones with approve, release and refund', status: 'shipped' },
      { text: 'Coin wallet with a double-entry ledger and bank withdrawals', status: 'shipped' },
      { text: 'Disputes settled by a conflict-checked arbitrator', status: 'shipped' },
      { text: 'AI project-risk review and dispute summaries (advice only)', status: 'shipped' },
      { text: '3D escrow ring driven by real contract data', status: 'shipped' },
    ],
    architecture: [
      { layer: 'Web app', detail: 'Next.js 15 App Router with React 19 and Tailwind: marketing site, auth, and the product (dashboard, work, contracts, messages, disputes, wallet, admin).' },
      { layer: 'Data', detail: 'Supabase Postgres with row-level security; workflow logic in database functions across 13 ordered migrations, with database tests.' },
      { layer: 'Money', detail: 'TrustLance Coins (1 coin = ₹1) on a double-entry ledger: purchases via Razorpay, escrow holds, auto-release and verified bank payouts.' },
      { layer: 'AI', detail: 'Genkit flows on Gemini review project briefs for risk and summarise disputes — they advise, people decide.' },
      { layer: 'Quality', detail: 'Playwright end-to-end journeys on desktop and mobile, Vitest unit tests.' },
    ],
    challenges: [
      { title: 'Money nobody can quietly move', text: 'Every coin movement is a ledger entry written by service-only database functions, so a milestone is never marked paid until the money actually moved.' },
      { title: 'From hackathon to product', text: 'Rebuilt the winning prototype from the ground up: a single ordered database history, RLS on every table, and a redesigned interface.' },
    ],
    links: [{ label: 'Code', href: 'https://github.com/TheParthi/TRTLance' }],
    note: 'Won the GDG KSR Web3 Hackathon (Shardeum) as a team project; v2 rebuild led by me. Screens captured from the site running locally.',
  },
  {
    id: 'blockspy',
    index: '04',
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
    index: '05',
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
