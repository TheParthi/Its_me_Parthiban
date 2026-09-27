import { useMemo, type ReactNode } from 'react'
import { authHeader } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { cn, fmtDateTime, fmtRelative } from '../../lib/format'
import { Badge, type BadgeTone } from '../ui'
import type { Permission } from '@pg/shared'

/** Session id (`sid` claim) of the current access token, decoded client-side for display only. */
export function currentSessionId(): string | null {
  const h = authHeader().Authorization
  if (!h) return null
  const part = h.replace(/^Bearer\s+/, '').split('.')[1]
  if (!part) return null
  try {
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '='))
    const sid = (JSON.parse(json) as { sid?: unknown }).sid
    return typeof sid === 'string' ? sid : null
  } catch {
    return null
  }
}

/** Returns `{ allowed, reason }` for a permission — used to disable controls with a tooltip. */
export function usePerm(p: Permission) {
  const { can } = useAuth()
  const allowed = can(p)
  return useMemo(() => ({ allowed, reason: allowed ? undefined : `Requires the “${p}” permission` }), [allowed, p])
}

/** Wraps a (possibly disabled) control so its tooltip still shows. */
export function Gate({ reason, children, className }: { reason?: string; children: ReactNode; className?: string }) {
  if (!reason) return <>{children}</>
  return (
    <span title={reason} className={cn('inline-flex cursor-not-allowed', className)}>
      {children}
    </span>
  )
}

export function When({ iso, className }: { iso: string | null | undefined; className?: string }) {
  if (!iso) return <span className="text-dim">—</span>
  return (
    <time dateTime={iso} title={fmtDateTime(iso)} className={cn('whitespace-nowrap', className)}>
      {fmtRelative(iso)}
    </time>
  )
}

export function SuccessBadge({ success }: { success: boolean }) {
  return (
    <Badge tone={success ? 'emerald' : 'rose'} dot>
      {success ? 'ok' : 'failed'}
    </Badge>
  )
}

const ROLE_TONE: Record<string, BadgeTone> = { SUPER_ADMIN: 'violet', ADMIN: 'cyan', EDITOR: 'emerald', ANALYST: 'amber' }
export function RoleBadge({ role, label }: { role: string; label?: string }) {
  return <Badge tone={ROLE_TONE[role] ?? 'neutral'}>{label ?? role.replace('_', ' ').toLowerCase()}</Badge>
}

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('font-mono text-[12px] text-[#c9ced8]', className)}>{children}</span>
}

/** Pretty-printed JSON in a scrollable code block (text only, never HTML). */
export function JsonBlock({ value, className }: { value: unknown; className?: string }) {
  let text: string
  try {
    text = value === undefined || value === null ? 'null' : JSON.stringify(value, null, 2)
  } catch {
    text = String(value)
  }
  return (
    <pre className={cn('scroll-thin max-h-80 overflow-auto rounded-lg border border-line bg-[#0b0e14] p-3 font-mono text-[12px] leading-relaxed text-[#c9ced8]', className)}>
      <code>{text}</code>
    </pre>
  )
}

/** Reads a string field from audit metadata. */
export function metaField(meta: unknown, key: string): string | null {
  if (!meta || typeof meta !== 'object') return null
  const v = (meta as Record<string, unknown>)[key]
  return v === undefined || v === null ? null : String(v)
}

export const REASON_LABELS: Record<string, string> = {
  unknown_user: 'Unknown email',
  locked: 'Account locked',
  bad_password: 'Wrong password',
  disabled: 'Account disabled',
}
