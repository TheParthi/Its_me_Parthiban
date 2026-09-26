import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { Request } from 'express'
import type { RoleName } from '@pg/shared'
import { AuditService } from '../audit/audit.service'
import { AuthService } from '../auth/auth.service'
import { env } from '../config/env'
import { randomToken, sha256 } from '../common/crypto'
import type { RequestUser } from '../common/decorators'
import { MailerService } from '../common/mailer.service'
import { PrismaService } from '../prisma/prisma.service'

const publicUser = {
  id: true,
  email: true,
  name: true,
  disabled: true,
  totpEnabled: true,
  lastLoginAt: true,
  passwordChangedAt: true,
  lockedUntil: true,
  createdAt: true,
  passwordHash: true,
  role: { select: { name: true, label: true } },
} as const

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly auth: AuthService,
    private readonly mailer: MailerService,
  ) {}

  async list() {
    const users = await this.prisma.adminUser.findMany({ select: publicUser, orderBy: { createdAt: 'asc' } })
    const active = await this.prisma.adminSession.groupBy({
      by: ['userId'],
      where: { revokedAt: null, rotatedAt: null, expiresAt: { gt: new Date() } },
      _count: true,
    })
    return users.map(({ passwordHash, ...u }) => ({
      ...u,
      pendingInvite: !passwordHash,
      activeSessions: active.find((a) => a.userId === u.id)?._count ?? 0,
    }))
  }

  async invite(actor: RequestUser, email: string, name: string, role: RoleName, req: Request) {
    if (await this.prisma.adminUser.findUnique({ where: { email } })) throw new ConflictException('An administrator with this email already exists')
    const r = await this.prisma.role.findUniqueOrThrow({ where: { name: role } })
    const user = await this.prisma.adminUser.create({ data: { email, name, roleId: r.id, invitedById: actor.id } })
    const token = randomToken()
    await this.prisma.authToken.create({ data: { type: 'INVITE', userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 72 * 3_600_000) } })
    const link = `${env().ADMIN_ORIGIN}/admin/accept-invite?token=${encodeURIComponent(token)}`
    const sent = await this.mailer.send(email, 'You have been invited to the portfolio admin', `${actor.name} invited you as ${r.label}.\n\nSet your password within 72 hours:\n${link}`)
    await this.audit.record({ action: 'user.invite', actor, resourceType: 'user', resourceId: user.id, metadata: { email, role }, req })
    // Without SMTP the link is returned once so the inviter can share it securely.
    return { id: user.id, emailSent: sent, inviteLink: sent ? null : link }
  }

  private async activeSuperAdmins() {
    return this.prisma.adminUser.count({ where: { role: { name: 'SUPER_ADMIN' }, disabled: false, passwordHash: { not: null } } })
  }

  async update(actor: RequestUser, id: string, patch: { name?: string; role?: RoleName; disabled?: boolean }, req: Request) {
    const target = await this.prisma.adminUser.findUnique({ where: { id }, include: { role: true } })
    if (!target) throw new NotFoundException()
    if (id === actor.id && (patch.role || patch.disabled !== undefined)) {
      throw new ForbiddenException('You cannot change your own role or disable yourself')
    }
    if (patch.role === 'SUPER_ADMIN' && actor.role !== 'SUPER_ADMIN') throw new ForbiddenException('Only a Super Admin can grant Super Admin')
    if (target.role.name === 'SUPER_ADMIN' && actor.role !== 'SUPER_ADMIN') throw new ForbiddenException('Only a Super Admin can change a Super Admin')
    const demoting = target.role.name === 'SUPER_ADMIN' && ((patch.role && patch.role !== 'SUPER_ADMIN') || patch.disabled === true)
    if (demoting && (await this.activeSuperAdmins()) <= 1) throw new BadRequestException('This is the last active Super Admin')

    const role = patch.role ? await this.prisma.role.findUniqueOrThrow({ where: { name: patch.role } }) : null
    const updated = await this.prisma.adminUser.update({
      where: { id },
      data: { ...(patch.name ? { name: patch.name } : {}), ...(role ? { roleId: role.id } : {}), ...(patch.disabled !== undefined ? { disabled: patch.disabled } : {}) },
      select: publicUser,
    })
    if (patch.disabled || role) await this.auth.revokeAllForUser(id, patch.disabled ? 'account_disabled' : 'role_changed')
    await this.audit.record({
      action: role ? 'user.role_change' : patch.disabled !== undefined ? (patch.disabled ? 'user.disable' : 'user.enable') : 'user.update',
      actor,
      resourceType: 'user',
      resourceId: id,
      metadata: { from: target.role.name, ...patch },
      req,
    })
    const { passwordHash, ...rest } = updated
    return { ...rest, pendingInvite: !passwordHash }
  }

  async remove(actor: RequestUser, id: string, req: Request) {
    if (id === actor.id) throw new ForbiddenException('You cannot remove yourself')
    const target = await this.prisma.adminUser.findUnique({ where: { id }, include: { role: true } })
    if (!target) throw new NotFoundException()
    if (target.role.name === 'SUPER_ADMIN' && (await this.activeSuperAdmins()) <= 1) throw new BadRequestException('This is the last active Super Admin')
    await this.prisma.adminUser.delete({ where: { id } })
    await this.audit.record({ action: 'user.remove', actor, resourceType: 'user', resourceId: id, metadata: { email: target.email }, req })
    return { ok: true }
  }

  async revokeSessions(actor: RequestUser, id: string, req: Request) {
    const r = await this.auth.revokeAllForUser(id, 'revoked_by_admin')
    await this.audit.record({ action: 'user.sessions_revoked', actor, resourceType: 'user', resourceId: id, metadata: { count: r.count }, req })
    return { revoked: r.count }
  }

  activity(id: string) {
    return this.prisma.adminAuditLog
      .findMany({ where: { actorId: id }, orderBy: { id: 'desc' }, take: 50 })
      .then((rows) => rows.map((r) => ({ ...r, id: r.id.toString() })))
  }

  roles() {
    return this.prisma.role.findMany({
      orderBy: { createdAt: 'asc' },
      include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } },
    }).then((rs) => rs.map((r) => ({ name: r.name, label: r.label, users: r._count.users, permissions: r.permissions.map((p) => p.permission.key) })))
  }
}
