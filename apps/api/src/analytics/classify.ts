import type { Request } from 'express'
import type { SourceCategory } from '@pg/shared'
import { env } from '../config/env'

const SEARCH = /(^|\.)(google|bing|duckduckgo|yahoo|baidu|yandex|ecosia)\.[a-z.]+$/
const SOCIAL = [
  'linkedin.com', 'lnkd.in', 'twitter.com', 'x.com', 't.co', 'facebook.com', 'fb.com', 'm.facebook.com',
  'instagram.com', 'reddit.com', 'github.com', 'youtube.com', 'youtu.be', 'whatsapp.com', 'wa.me',
]
const matches = (host: string, d: string) => host === d || host.endsWith(`.${d}`)

/** Host only — path, query and credentials are discarded. */
export function referrerDomain(ref: string | undefined): string | null {
  if (!ref) return null
  try {
    const u = new URL(ref)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.hostname.toLowerCase().replace(/^www\./, '') || null
  } catch {
    return null
  }
}

const siteHost = () => new URL(env().PUBLIC_SITE_URL).hostname.toLowerCase().replace(/^www\./, '')

export function classifySource(domain: string | null, utm?: { source?: string; medium?: string; campaign?: string }): {
  source: SourceCategory
  referrerDomain: string | null
} {
  if (utm && (utm.source || utm.medium || utm.campaign)) return { source: 'campaign', referrerDomain: domain === siteHost() ? null : domain }
  if (!domain) return { source: 'direct', referrerDomain: null }
  if (domain === siteHost()) return { source: 'internal', referrerDomain: null }
  if (SEARCH.test(domain)) return { source: 'search', referrerDomain: domain }
  if (SOCIAL.some((d) => matches(domain, d))) return { source: 'social', referrerDomain: domain }
  return { source: 'referral', referrerDomain: domain }
}

const header = (req: Request, name: string) => {
  const v = req.headers[name]
  return (Array.isArray(v) ? v[0] : v)?.trim() || undefined
}

/** Country/region only when a CDN already supplies them. IPs are never geolocated. */
export function cdnGeo(req: Request) {
  const c = header(req, 'cf-ipcountry') ?? header(req, 'x-vercel-ip-country') ?? header(req, 'cloudfront-viewer-country')
  const r = header(req, 'cloudfront-viewer-country-region') ?? header(req, 'x-vercel-ip-country-region')
  const country = c && /^[A-Za-z]{2}$/.test(c) && !/^(XX|T1)$/i.test(c) ? c.toUpperCase() : null
  const region = country && r && /^[A-Za-z0-9-]{1,10}$/.test(r) ? r.toUpperCase() : null
  return { country, region }
}

export const optedOut = (req: Request) => header(req, 'dnt') === '1' || header(req, 'sec-gpc') === '1'
