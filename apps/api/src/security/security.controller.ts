import { Controller, Get, HttpCode, NotFoundException, Param, Post, Req } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { AuditService } from '../audit/audit.service'
import { CurrentUser, RequestUser, RequirePermissions } from '../common/decorators'
import { PrismaService } from '../prisma/prisma.service'
import { SettingsService } from '../settings/settings.service'

const map = (rows: { id: bigint }[]) => rows.map((r) => ({ ...r, id: r.id.toString() }))

@ApiTags('security')
@Controller('admin/security')
export class SecurityController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly settings: SettingsService,
  ) {}

  @Get('overview')
  @RequirePermissions('security:read')
  async overview() {
    const since = new Date(Date.now() - 30 * 86_400_000)
    const [logins, failed, lockouts, passwordChanges, suspicious, sessions, users, policy] = await Promise.all([
      this.prisma.adminAuditLog.findMany({ where: { action: 'auth.login', success: true, createdAt: { gte: since } }, orderBy: { id: 'desc' }, take: 25 }),
      this.prisma.adminAuditLog.findMany({ where: { action: { in: ['auth.login', 'auth.2fa'] }, success: false, createdAt: { gte: since } }, orderBy: { id: 'desc' }, take: 50 }),
      this.prisma.adminAuditLog.findMany({ where: { action: 'auth.lockout', createdAt: { gte: since } }, orderBy: { id: 'desc' }, take: 25 }),
      this.prisma.adminAuditLog.findMany({ where: { action: { in: ['auth.password_change', 'auth.password_reset'] }, createdAt: { gte: since } }, orderBy: { id: 'desc' }, take: 25 }),
      this.prisma.adminAuditLog.findMany({ where: { action: { in: ['auth.refresh_reuse', 'auth.2fa_disabled'] }, createdAt: { gte: since } }, orderBy: { id: 'desc' }, take: 25 }),
      this.prisma.adminSession.findMany({
        where: { revokedAt: null, rotatedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { lastUsedAt: 'desc' },
        select: { id: true, userAgent: true, ipPrefix: true, createdAt: true, lastUsedAt: true, expiresAt: true, remember: true, user: { select: { id: true, email: true, name: true } } },
      }),
      this.prisma.adminUser.findMany({ select: { id: true, email: true, name: true, totpEnabled: true, disabled: true, lockedUntil: true, role: { select: { name: true } } } }),
      this.settings.get(),
    ])
    return {
      logins: map(logins),
      failedLogins: map(failed),
      lockouts: map(lockouts),
      passwordChanges: map(passwordChanges),
      suspicious: map(suspicious),
      sessions,
      twoFactor: users.map((u) => ({ ...u, role: u.role.name })),
      policy: policy.security,
    }
  }

  @Post('sessions/:id/revoke')
  @HttpCode(200)
  @RequirePermissions('security:write')
  async revoke(@Param('id') id: string, @CurrentUser() u: RequestUser, @Req() req: Request) {
    const s = await this.prisma.adminSession.findUnique({ where: { id } })
    if (!s) throw new NotFoundException()
    await this.prisma.adminSession.updateMany({ where: { familyId: s.familyId, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: 'revoked_by_admin' } })
    await this.audit.record({ action: 'security.session_revoke', actor: u, resourceType: 'session', resourceId: id, metadata: { userId: s.userId }, req })
    return { ok: true }
  }
}
