import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { AnalyticsOverview } from '@pg/shared'
import { get, type QueryValue } from '../../lib/api'

type Q = Record<string, QueryValue>
type KeyCount = { key: string; count: number }

export interface ProjectStat {
  slug: string
  title: string
  views: number
  uniqueSessions: number
  avgEngagementSec: number | null
  demoClicks: number
  githubClicks: number
  otherClicks: number
  ctr: number | null
  sources: KeyCount[]
}

export interface SessionRow {
  id: string
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

export interface SessionEvent {
  id: string
  type: string
  path: string
  projectSlug: string | null
  section: string | null
  target: string | null
  value: number | null
  createdAt: string
}

export interface LiveResponse {
  windowMinutes: number
  sessions: { id: string; currentPath: string; lastSeenAt: string; device: string; referrerDomain: string | null }[]
  note: string
}

const opts = { placeholderData: keepPreviousData, staleTime: 30_000 } as const

export function useOverview(query: Q, enabled = true) {
  return useQuery({
    queryKey: ['analytics', 'overview', query],
    enabled,
    ...opts,
    queryFn: ({ signal }) => get<AnalyticsOverview>('/admin/analytics/overview', query, signal),
  })
}

export function useSources(query: Q) {
  return useQuery({
    queryKey: ['analytics', 'sources', query],
    ...opts,
    queryFn: ({ signal }) =>
      get<{ range: { from: string; to: string }; sources: KeyCount[]; referrers: KeyCount[]; campaigns: KeyCount[] }>('/admin/analytics/sources', query, signal),
  })
}

export function useProjectStats(query: Q, enabled = true) {
  return useQuery({
    queryKey: ['analytics', 'projects', query],
    enabled,
    ...opts,
    queryFn: ({ signal }) => get<{ range: { from: string; to: string }; items: ProjectStat[] }>('/admin/analytics/projects', query, signal),
  })
}

export function useJourneys(query: Q) {
  return useQuery({
    queryKey: ['analytics', 'journeys', query],
    ...opts,
    queryFn: ({ signal }) => get<{ steps: string[]; sessions: number }[]>('/admin/analytics/journeys', query, signal),
  })
}

export function useSessions(page: number, pageSize: number, enabled: boolean) {
  return useQuery({
    queryKey: ['analytics', 'sessions', page, pageSize],
    enabled,
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) => get<{ items: SessionRow[]; total: number }>('/admin/analytics/sessions', { page, pageSize }, signal),
  })
}

export function useSession(id: string | null) {
  return useQuery({
    queryKey: ['analytics', 'session', id],
    enabled: !!id,
    queryFn: ({ signal }) => get<SessionRow & { events: SessionEvent[] }>(`/admin/analytics/sessions/${id}`, undefined, signal),
  })
}

export function useLive(enabled: boolean) {
  return useQuery({
    queryKey: ['analytics', 'live'],
    enabled,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
    queryFn: ({ signal }) => get<LiveResponse>('/admin/analytics/live', undefined, signal),
  })
}
