import { Injectable, Logger } from '@nestjs/common'
import type { Request } from 'express'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { clientIp, ipPrefix } from '../common/request-meta'
import type { RequestUser } from '../common/decorators'

/** Keys that must never be written to the audit log. */
const REDACT = /pass(word)?|token|secret|code|otp|authorization|cookie/i

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 4 || value == null) return value
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => scrub(v, depth + 1))
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, REDACT.test(k) ? '[redacted]' : scrub(v, depth + 1)]),
    )
  }
  if (typeof value === 'string') return value.slice(0, 500)
  return value
}

export interface AuditEntry {
  action: string
  actor?: Pick<RequestUser, 'id' | 'email'> | { id: string | null; email: string | null } | null
  resourceType?: string
  resourceId?: string | null
  success?: boolean
  metadata?: Record<string, unknown>
  req?: Request
}

@Injectable()
export class AuditService {
  private readonly log = new Logger('Audit')
  constructor(private readonly prisma: PrismaService) {}

  async record(e: AuditEntry) {
    try {
      await this.prisma.adminAuditLog.create({
        data: {
          action: e.action,
          actorId: e.actor?.id ?? null,
          actorEmail: e.actor?.email ?? null,
          resourceType: e.resourceType ?? null,
          resourceId: e.resourceId ?? null,
          success: e.success ?? true,
          metadata: e.metadata ? (scrub(e.metadata) as Prisma.InputJsonValue) : undefined,
          ipPrefix: e.req ? ipPrefix(clientIp(e.req)) : null,
        },
      })
    } catch (err) {
      // Auditing must never break the action itself, but it must be visible.
      this.log.error(`Failed to write audit entry ${e.action}: ${(err as Error).message}`)
    }
  }
}
