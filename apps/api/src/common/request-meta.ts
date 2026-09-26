import type { Request } from 'express'
import { UAParser } from 'ua-parser-js'
import { env } from '../config/env'
import { sha256 } from './crypto'

export function clientIp(req: Request): string {
  return (req.ip || req.socket.remoteAddress || '').replace(/^::ffff:/, '')
}

/** Truncated address for security views: IPv4 /24, IPv6 /48. */
export function ipPrefix(ip: string): string {
  if (!ip) return ''
  if (ip.includes('.')) {
    const p = ip.split('.')
    return p.length === 4 ? `${p[0]}.${p[1]}.${p[2]}.0/24` : ''
  }
  const parts = ip.split(':').slice(0, 3)
  return `${parts.join(':')}::/48`
}

/** Salted hash for rate-limit keys. Not reversible to the address. */
export const ipKey = (ip: string) => sha256(`${env().IP_HASH_SALT}:${ip}`).slice(0, 32)

export function uaSummary(req: Request) {
  const r = new UAParser(req.headers['user-agent'] ?? '').getResult()
  const type = r.device.type
  const device = type === 'mobile' ? 'mobile' : type === 'tablet' ? 'tablet' : r.browser.name ? 'desktop' : 'unknown'
  return {
    browser: r.browser.name ?? 'Other',
    os: r.os.name ?? 'Other',
    device,
    label: [r.browser.name, r.os.name].filter(Boolean).join(' on ') || 'Unknown browser',
  }
}
