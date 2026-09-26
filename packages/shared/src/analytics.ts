import { z } from 'zod'

export const EVENT_TYPES = [
  'PAGE_VIEW',
  'PROJECT_VIEW',
  'PROJECT_CLICK',
  'RESUME_DOWNLOAD',
  'GITHUB_CLICK',
  'LINKEDIN_CLICK',
  'CONTACT_FORM_START',
  'CONTACT_FORM_SUBMIT',
  'SECTION_VIEW',
  'CTA_CLICK',
  'HEARTBEAT',
] as const
export type EventType = (typeof EVENT_TYPES)[number]

const shortText = (max: number) => z.string().trim().max(max)

/**
 * One tracked interaction. Never carries form contents, emails, tokens or
 * free text typed by the visitor.
 */
export const analyticsEventSchema = z.object({
  type: z.enum(EVENT_TYPES),
  path: shortText(200).regex(/^\/[^\s]*$/, 'Must be a path'),
  projectSlug: shortText(80).regex(/^[a-z0-9-]*$/).optional(),
  section: shortText(40).regex(/^[a-z0-9-]*$/).optional(),
  /** CTA / link identifier, e.g. "hero-explore" or "demo". Not a URL. */
  target: shortText(60).regex(/^[a-zA-Z0-9_.:-]*$/).optional(),
  /** Seconds visible, for SECTION_VIEW / HEARTBEAT. */
  value: z.number().int().min(0).max(86_400).optional(),
  ts: z.number().int().optional(),
})
export type AnalyticsEvent = z.infer<typeof analyticsEventSchema>

export const analyticsBatchSchema = z.object({
  /** Random per-tab session id (UUID). */
  sessionId: z.string().uuid(),
  /** Random per-browser id, only sent after consent. Not a person. */
  visitorId: z.string().uuid().nullable().optional(),
  /** Referrer URL at landing; the API keeps only its domain. */
  referrer: shortText(500).optional(),
  utm: z
    .object({
      source: shortText(80).optional(),
      medium: shortText(80).optional(),
      campaign: shortText(120).optional(),
    })
    .optional(),
  screen: z.object({ w: z.number().int().min(0).max(10000), h: z.number().int().min(0).max(10000) }).optional(),
  events: z.array(analyticsEventSchema).min(1).max(25),
})
export type AnalyticsBatch = z.infer<typeof analyticsBatchSchema>

export const DEVICE_CATEGORIES = ['desktop', 'tablet', 'mobile', 'unknown'] as const
export const SOURCE_CATEGORIES = ['direct', 'search', 'social', 'referral', 'campaign', 'internal'] as const
export type SourceCategory = (typeof SOURCE_CATEGORIES)[number]

export const rangeQuerySchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  preset: z.enum(['today', '7d', '30d', '90d', 'custom']).default('7d'),
  path: z.string().max(200).optional(),
  source: z.enum(SOURCE_CATEGORIES).optional(),
  campaign: z.string().max(120).optional(),
})
export type RangeQuery = z.infer<typeof rangeQuerySchema>

export interface MetricWithDelta {
  value: number
  previous: number
}

export interface AnalyticsOverview {
  range: { from: string; to: string; bucket: 'hour' | 'day' }
  cards: {
    sessions: MetricWithDelta
    uniqueVisitors: MetricWithDelta
    pageViews: MetricWithDelta
    projectViews: MetricWithDelta
    avgEngagementSec: MetricWithDelta
    engagementRate: MetricWithDelta
    contactSubmissions: MetricWithDelta
    newVisitors: MetricWithDelta
    returningVisitors: MetricWithDelta
  }
  series: { t: string; sessions: number; pageViews: number; submissions: number }[]
  devices: { key: string; count: number }[]
  browsers: { key: string; count: number }[]
  os: { key: string; count: number }[]
  sources: { key: string; count: number }[]
  referrers: { key: string; count: number }[]
  campaigns: { key: string; count: number }[]
  countries: { key: string; count: number }[]
  topPages: { key: string; count: number }[]
  topProjects: { key: string; count: number }[]
  clicks: { github: number; linkedin: number; resume: number; cta: number }
  definitions: Record<string, string>
}
