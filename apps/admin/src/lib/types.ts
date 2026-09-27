/**
 * Response shapes of admin endpoints that are not exported by @pg/shared.
 * Endpoints still being implemented are typed from docs/API_CONTRACT.md and
 * read through the tolerant normalisers in ./normalize.ts.
 */
import type {
  AchievementInput,
  CertificationInput,
  Collection,
  ContentStatus,
  EducationInput,
  ExperienceInput,
  MessageStatus,
  RoleName,
  SkillInput,
} from '@pg/shared'

export interface Paged<T> {
  items: T[]
  total: number
}

export type DocumentKey = 'profile' | 'homepage' | 'appearance' | 'seo'

export interface DocumentResponse<T> {
  key: string
  draft: T
  published: T | null
  status: ContentStatus
  publishedAt: string | null
  updatedAt: string
  hasUnpublishedChanges: boolean
}

/** Fields every draft/publish entity carries in admin lists. */
export interface AdminMeta {
  id: string
  order: number
  status: ContentStatus
  hasUnpublishedChanges: boolean
  publishedAt: string | null
  updatedAt: string
  deletedAt?: string | null
}

export interface SkillCategory {
  id: string
  name: string
  color: string
  order: number
  skillCount?: number
}

export type SkillAdmin = SkillInput & AdminMeta

export interface CollectionInputs {
  experience: ExperienceInput
  education: EducationInput
  certifications: CertificationInput
  achievements: AchievementInput
}
export type CollectionAdmin<C extends Collection> = CollectionInputs[C] & AdminMeta

export interface VersionEntry {
  id: string
  version: number
  action: string
  author: { id?: string; name?: string; email?: string } | string | null
  createdAt: string
}

export interface VersionSnapshot extends VersionEntry {
  entityType?: string
  entityId?: string
  snapshot: unknown
}

export const MEDIA_CATEGORIES = ['PROFILE', 'PROJECT', 'ICON', 'BACKGROUND', 'DOCUMENT', 'OTHER'] as const
export type MediaCategory = (typeof MEDIA_CATEGORIES)[number]

export interface MediaAsset {
  id: string
  url: string
  fileName: string
  originalName: string
  mimeType: string
  size: number
  width: number | null
  height: number | null
  alt: string
  category: MediaCategory
  createdAt: string
  updatedAt: string
  uploadedBy?: { id: string; name: string; email?: string } | null
}

export interface MediaUsage {
  type: string
  id: string
  title: string
  published: boolean
}

export interface ContactMessage {
  id: string
  name: string
  email: string
  subject: string
  message: string
  status: MessageStatus
  createdAt: string
  updatedAt: string
}

export interface MessagesResponse extends Paged<ContactMessage> {
  counts?: Partial<Record<MessageStatus | 'ALL', number>>
}

export interface Notification {
  id: string
  type: string
  title: string
  body: string
  link: string | null
  createdAt: string
  read: boolean
}

export interface AdminUserRow {
  id: string
  email: string
  name: string
  disabled: boolean
  totpEnabled: boolean
  lastLoginAt: string | null
  passwordChangedAt: string | null
  lockedUntil: string | null
  createdAt: string
  role: { name: RoleName; label: string }
  pendingInvite: boolean
  activeSessions: number
}

export interface RoleRow {
  name: RoleName
  label: string
  users: number
  permissions: string[]
}

export interface InviteResult {
  id: string
  emailSent: boolean
  inviteLink: string | null
}

export interface AuditRow {
  id: string
  actorId: string | null
  actorEmail: string | null
  action: string
  resourceType: string | null
  resourceId: string | null
  success: boolean
  metadata: unknown
  ipPrefix: string | null
  createdAt: string
}

export interface AuditPage {
  items: AuditRow[]
  nextCursor: string | null
}

export interface SecuritySession {
  id: string
  userAgent: string | null
  ipPrefix: string | null
  createdAt: string
  lastUsedAt: string | null
  expiresAt: string
  remember: boolean
  user: { id: string; email: string; name: string }
}

export interface SecurityOverview {
  logins: AuditRow[]
  failedLogins: AuditRow[]
  lockouts: AuditRow[]
  passwordChanges: AuditRow[]
  suspicious: AuditRow[]
  sessions: SecuritySession[]
  twoFactor: { id: string; email: string; name: string; totpEnabled: boolean; disabled: boolean; lockedUntil: string | null; role: RoleName }[]
  policy: { accessTokenMinutes: number; sessionDays: number; maxFailedLogins: number; lockoutMinutes: number; enforce2fa: boolean }
}

export interface SystemInfo {
  environment: string
  storage: { driver: string; configured: boolean; bucket: string | null; region: string | null }
  email: { configured: boolean; from: string | null }
  publicSiteUrl: string
  publicOrigins: string[]
}

export interface PreviewToken {
  token: string
  url: string
  expiresAt?: string
}

export interface SearchHit {
  id: string
  title: string
  subtitle?: string
  group: SearchGroup
}
export const SEARCH_GROUPS = ['projects', 'skills', 'experience', 'messages', 'media', 'users'] as const
export type SearchGroup = (typeof SEARCH_GROUPS)[number]

export interface ProjectAnalyticsRow {
  slug: string
  title: string
  views: number
  uniqueSessions: number
  avgEngagementSec: number | null
  demoClicks: number
  githubClicks: number
  otherClicks?: number
  ctr: number | null
  sources?: { key: string; count: number }[] | Record<string, number>
}

export interface Journey {
  steps: string[]
  sessions: number
}

export interface AnalyticsSessionRow {
  id: string
  /** Short hash of the anonymous visitor id (not a person). */
  visitor: string | null
  isNewVisitor: boolean
  startedAt: string
  lastSeenAt: string
  landingPath: string
  currentPath: string
  referrerDomain: string | null
  source: string
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  device: string
  browser: string
  os: string
  country: string | null
  region: string | null
  pageViews: number
  eventCount: number
  engagedSec: number
}

export interface AnalyticsEventRow {
  id: string | number
  type: string
  path: string
  projectSlug: string | null
  section: string | null
  target: string | null
  value: number | null
  createdAt: string
}

export interface AnalyticsSessionDetail extends AnalyticsSessionRow {
  events: AnalyticsEventRow[]
}

export interface LiveSession {
  id: string
  currentPath: string
  lastSeenAt: string
  device: string
  referrerDomain: string | null
}

export interface LiveVisitors {
  count: number
  windowMinutes: number | null
  sessions: LiveSession[]
  note: string | null
}
