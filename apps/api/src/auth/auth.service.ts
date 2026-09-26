import { ForbiddenException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common'
import { hash, verify } from '@node-rs/argon2'
import { authenticator } from 'otplib'
import QRCode from 'qrcode'
import jwt from 'jsonwebtoken'
import type { Request, Response } from 'express'
import { AuthTokenType } from '@prisma/client'
import type { AuthUser, LoginResponse } from '@pg/shared'
import { AuditService } from '../audit/audit.service'
import { env } from '../config/env'
import { decrypt, encrypt, randomToken, sha256 } from '../common/crypto'
import { clientIp, ipPrefix, uaSummary } from '../common/request-meta'
import { MailerService } from '../common/mailer.service'
import { NotificationsService } from '../notifications/notifications.service'
import { PrismaService } from '../prisma/prisma.service'
import { SettingsService } from '../settings/settings.service'

export const REFRESH_COOKIE = 'pg_refresh'
const ARGON = { algorithm: 2 /* Argon2id */, memoryCost: 19456, timeCost: 2, parallelism: 1 }
/** A rotated refresh token re-presented within this window is treated as a benign race (two tabs), not theft. */
const ROTATION_GRACE_MS = 15_000
/** Used to keep login timing uniform when the email does not exist. */
let dummyHash: Promise<string> | null = null

export interface AccessClaims {
  sub: string
  sid: string
  authAt: number
}

authenticator.options = { window: 1 }

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly settings: SettingsService,
    private readonly mailer: MailerService,
    private readonly notifications: NotificationsService,
  ) {}

  hashPassword(p: string) {
    return hash(p, ARGON)
  }

  // -------------------------------------------------------------------------
  // Login
  // -------------------------------------------------------------------------

  async login(email: string, password: string, remember: boolean, req: Request, res: Response): Promise<LoginResponse> {
    const policy = (await this.settings.get()).security
    const user = await this.prisma.adminUser.findUnique({ where: { email } })
    const generic = new UnauthorizedException('Incorrect email or password')

    if (!user || !user.passwordHash) {
      dummyHash ??= hash('timing-equaliser-not-a-password', ARGON)
      await verify(await dummyHash, password).catch(() => false)
      await this.audit.record({ action: 'auth.login', success: false, metadata: { email, reason: 'unknown_user' }, req })
      throw generic
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.audit.record({ action: 'auth.login', actor: user, success: false, metadata: { reason: 'locked' }, req })
      throw new HttpException('Too many failed attempts. Try again later or reset your password.', HttpStatus.TOO_MANY_REQUESTS)
    }

    const ok = await verify(user.passwordHash, password).catch(() => false)
    if (!ok) {
      const count = user.failedLoginCount + 1
      const over = count - policy.maxFailedLogins
      // Progressive lockout: lockoutMinutes, then doubling for every further failure.
      const lockedUntil = over >= 0 ? new Date(Date.now() + policy.lockoutMinutes * 60_000 * 2 ** Math.min(over, 6)) : null
      await this.prisma.adminUser.update({ where: { id: user.id }, data: { failedLoginCount: count, lockedUntil } })
      await this.audit.record({ action: 'auth.login', actor: user, success: false, metadata: { reason: 'bad_password', failedCount: count }, req })
      if (lockedUntil) {
        await this.audit.record({ action: 'auth.lockout', actor: user, success: false, metadata: { until: lockedUntil.toISOString() }, req })
        await this.notifications.create({
          type: 'security',
          title: 'Account locked after failed logins',
          body: `An administrator account was locked until ${lockedUntil.toISOString()}.`,
          link: '/security',
          permission: 'security:read',
        })
      }
      throw generic
    }
    if (user.disabled) {
      await this.audit.record({ action: 'auth.login', actor: user, success: false, metadata: { reason: 'disabled' }, req })
      throw new ForbiddenException('This account is disabled')
    }

    await this.prisma.adminUser.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null } })

    if (user.totpEnabled) {
      const challenge = randomToken()
      await this.prisma.authToken.create({
        data: {
          type: AuthTokenType.TWO_FACTOR_CHALLENGE,
          userId: user.id,
          tokenHash: sha256(challenge),
          expiresAt: new Date(Date.now() + 5 * 60_000),
          meta: { remember, attempts: 0 },
        },
      })
      await this.audit.record({ action: 'auth.login.password_ok', actor: user, metadata: { next: '2fa' }, req })
      return { status: '2fa_required', challengeId: challenge }
    }

    return this.completeLogin(user.id, remember, req, res)
  }

  async verifyTwoFactor(challengeId: string, code: string, req: Request, res: Response): Promise<LoginResponse> {
    const t = await this.prisma.authToken.findUnique({ where: { tokenHash: sha256(challengeId) }, include: { user: true } })
    if (!t || t.type !== 'TWO_FACTOR_CHALLENGE' || t.usedAt || t.expiresAt < new Date()) {
      throw new UnauthorizedException('This sign-in attempt expired. Please sign in again.')
    }
    const meta = (t.meta ?? {}) as { remember?: boolean; attempts?: number }
    const secret = t.user.totpSecretEnc ? decrypt(t.user.totpSecretEnc) : null
    if (!secret || !authenticator.check(code, secret)) {
      const attempts = (meta.attempts ?? 0) + 1
      await this.prisma.authToken.update({
        where: { id: t.id },
        data: { meta: { ...meta, attempts }, ...(attempts >= 5 ? { usedAt: new Date() } : {}) },
      })
      await this.audit.record({ action: 'auth.2fa', actor: t.user, success: false, metadata: { attempts }, req })
      throw new UnauthorizedException('Incorrect code')
    }
    await this.prisma.authToken.update({ where: { id: t.id }, data: { usedAt: new Date() } })
    return this.completeLogin(t.userId, !!meta.remember, req, res)
  }

  private async completeLogin(userId: string, remember: boolean, req: Request, res: Response): Promise<LoginResponse> {
    const user = await this.prisma.adminUser.update({ where: { id: userId }, data: { lastLoginAt: new Date() } })
    const session = await this.createSession(userId, remember, req, res)
    await this.audit.record({ action: 'auth.login', actor: user, metadata: { sessionId: session.id, remember }, req })
    return this.accessFor(userId, session.id, Date.now())
  }

  // -------------------------------------------------------------------------
  // Sessions and tokens
  // -------------------------------------------------------------------------

  private async createSession(userId: string, remember: boolean, req: Request, res: Response, familyId?: string, expiresAt?: Date, authAt?: Date) {
    const policy = (await this.settings.get()).security
    const refresh = randomToken()
    // "Remember me" keeps the session for the configured days; otherwise 12 hours.
    const expires = expiresAt ?? new Date(Date.now() + (remember ? policy.sessionDays * 86_400_000 : 12 * 3_600_000))
    const session = await this.prisma.adminSession.create({
      data: {
        userId,
        refreshTokenHash: sha256(refresh),
        familyId: familyId ?? randomToken(12),
        remember,
        userAgent: uaSummary(req).label,
        ipPrefix: ipPrefix(clientIp(req)),
        expiresAt: expires,
        authAt: authAt ?? new Date(),
      },
    })
    this.setRefreshCookie(res, refresh, remember ? expires : null)
    return session
  }

  setRefreshCookie(res: Response, value: string, expires: Date | null) {
    res.cookie(REFRESH_COOKIE, value, {
      httpOnly: true,
      secure: env().COOKIE_SECURE,
      sameSite: 'strict',
      path: '/api/auth',
      ...(expires ? { expires } : {}),
    })
  }

  clearRefreshCookie(res: Response) {
    res.clearCookie(REFRESH_COOKIE, { httpOnly: true, secure: env().COOKIE_SECURE, sameSite: 'strict', path: '/api/auth' })
  }

  async accessFor(userId: string, sessionId: string, authAt: number): Promise<LoginResponse & { status: 'ok' }> {
    const policy = (await this.settings.get()).security
    const claims: AccessClaims = { sub: userId, sid: sessionId, authAt }
    const accessToken = jwt.sign(claims, env().JWT_ACCESS_SECRET, {
      algorithm: 'HS256',
      expiresIn: policy.accessTokenMinutes * 60,
      audience: 'pg-admin',
      issuer: 'pg-api',
    })
    return { status: 'ok', accessToken, expiresIn: policy.accessTokenMinutes * 60, user: await this.me(userId) }
  }

  verifyAccess(token: string): AccessClaims {
    return jwt.verify(token, env().JWT_ACCESS_SECRET, { algorithms: ['HS256'], audience: 'pg-admin', issuer: 'pg-api' }) as unknown as AccessClaims
  }

  /** Rotates the refresh token. Re-use of a rotated token revokes the whole family. */
  async refresh(token: string | undefined, req: Request, res: Response) {
    if (!token) throw new UnauthorizedException('No session')
    const s = await this.prisma.adminSession.findUnique({ where: { refreshTokenHash: sha256(token) }, include: { user: true } })
    if (!s) {
      this.clearRefreshCookie(res)
      throw new UnauthorizedException('Session not found')
    }
    if (s.rotatedAt) {
      if (Date.now() - s.rotatedAt.getTime() < ROTATION_GRACE_MS) throw new UnauthorizedException('Session was just refreshed; retry')
      await this.revokeFamily(s.familyId, 'refresh_token_reuse')
      await this.audit.record({ action: 'auth.refresh_reuse', actor: s.user, success: false, metadata: { familyId: s.familyId }, req })
      await this.notifications.create({
        type: 'security',
        title: 'Possible stolen session detected',
        body: 'An old refresh token was reused; the affected sessions were revoked.',
        link: '/security',
        permission: 'security:read',
      })
      this.clearRefreshCookie(res)
      throw new UnauthorizedException('Session revoked')
    }
    if (s.revokedAt || s.expiresAt < new Date() || s.user.disabled) {
      this.clearRefreshCookie(res)
      throw new UnauthorizedException('Session expired')
    }
    await this.prisma.adminSession.update({ where: { id: s.id }, data: { rotatedAt: new Date() } })
    const next = await this.createSession(s.userId, s.remember, req, res, s.familyId, s.expiresAt, s.authAt)
    return this.accessFor(s.userId, next.id, s.authAt.getTime())
  }

  async logout(token: string | undefined, sessionId: string | undefined, res: Response) {
    const where = token ? { refreshTokenHash: sha256(token) } : sessionId ? { id: sessionId } : null
    if (where) {
      const s = await this.prisma.adminSession.findUnique({ where })
      if (s) await this.revokeFamily(s.familyId, 'logout')
    }
    this.clearRefreshCookie(res)
  }

  revokeFamily(familyId: string, reason: string) {
    return this.prisma.adminSession.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: reason } })
  }

  revokeAllForUser(userId: string, reason: string, exceptFamily?: string) {
    return this.prisma.adminSession.updateMany({
      where: { userId, revokedAt: null, ...(exceptFamily ? { NOT: { familyId: exceptFamily } } : {}) },
      data: { revokedAt: new Date(), revokedReason: reason },
    })
  }

  async me(userId: string): Promise<AuthUser> {
    const u = await this.prisma.adminUser.findUniqueOrThrow({
      where: { id: userId },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    })
    const enforce = (await this.settings.get()).security.enforce2fa
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role.name as AuthUser['role'],
      permissions: u.role.permissions.map((p) => p.permission.key),
      twoFactorEnabled: u.totpEnabled,
      mustEnable2fa: enforce && !u.totpEnabled,
    }
  }

  async reauth(userId: string, sessionId: string, password: string, req: Request) {
    const u = await this.prisma.adminUser.findUniqueOrThrow({ where: { id: userId } })
    const ok = u.passwordHash ? await verify(u.passwordHash, password).catch(() => false) : false
    await this.audit.record({ action: 'auth.reauth', actor: u, success: ok, req })
    if (!ok) throw new UnauthorizedException('Incorrect password')
    const now = new Date()
    await this.prisma.adminSession.update({ where: { id: sessionId }, data: { authAt: now } })
    return this.accessFor(userId, sessionId, now.getTime())
  }

  // -------------------------------------------------------------------------
  // Passwords
  // -------------------------------------------------------------------------

  async forgotPassword(email: string, req: Request) {
    const u = await this.prisma.adminUser.findUnique({ where: { email } })
    if (u && !u.disabled && u.passwordHash) {
      const token = randomToken()
      await this.prisma.authToken.create({
        data: { type: 'PASSWORD_RESET', userId: u.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 30 * 60_000) },
      })
      const link = `${env().ADMIN_ORIGIN}/admin/reset-password?token=${encodeURIComponent(token)}`
      await this.mailer.send(u.email, 'Reset your portfolio admin password', `Use this link within 30 minutes to set a new password:\n\n${link}\n\nIf you did not ask for this, ignore this email.`)
      await this.audit.record({ action: 'auth.password_reset_requested', actor: u, req })
    } else {
      await this.audit.record({ action: 'auth.password_reset_requested', success: false, metadata: { email }, req })
    }
    // Same response either way so the endpoint cannot be used to find accounts.
    return { ok: true }
  }

  async resetPassword(token: string, password: string, req: Request) {
    const t = await this.prisma.authToken.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } })
    if (!t || t.type !== 'PASSWORD_RESET' || t.usedAt || t.expiresAt < new Date()) {
      throw new UnauthorizedException('This reset link is invalid or has expired')
    }
    await this.prisma.$transaction([
      this.prisma.authToken.update({ where: { id: t.id }, data: { usedAt: new Date() } }),
      this.prisma.authToken.updateMany({ where: { userId: t.userId, type: 'PASSWORD_RESET', usedAt: null }, data: { usedAt: new Date() } }),
      this.prisma.adminUser.update({
        where: { id: t.userId },
        data: { passwordHash: await this.hashPassword(password), passwordChangedAt: new Date(), failedLoginCount: 0, lockedUntil: null },
      }),
    ])
    await this.revokeAllForUser(t.userId, 'password_reset')
    await this.audit.record({ action: 'auth.password_reset', actor: t.user, req })
    return { ok: true }
  }

  async changePassword(userId: string, sessionId: string, current: string, next: string, req: Request) {
    const u = await this.prisma.adminUser.findUniqueOrThrow({ where: { id: userId } })
    const ok = u.passwordHash ? await verify(u.passwordHash, current).catch(() => false) : false
    if (!ok) {
      await this.audit.record({ action: 'auth.password_change', actor: u, success: false, req })
      throw new UnauthorizedException('Current password is incorrect')
    }
    await this.prisma.adminUser.update({ where: { id: userId }, data: { passwordHash: await this.hashPassword(next), passwordChangedAt: new Date() } })
    const s = await this.prisma.adminSession.findUnique({ where: { id: sessionId } })
    await this.revokeAllForUser(userId, 'password_changed', s?.familyId)
    await this.audit.record({ action: 'auth.password_change', actor: u, req })
    return { ok: true }
  }

  async acceptInvite(token: string, password: string, req: Request) {
    const t = await this.prisma.authToken.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } })
    if (!t || t.type !== 'INVITE' || t.usedAt || t.expiresAt < new Date() || t.user.disabled) {
      throw new UnauthorizedException('This invitation is invalid or has expired')
    }
    await this.prisma.$transaction([
      this.prisma.authToken.update({ where: { id: t.id }, data: { usedAt: new Date() } }),
      this.prisma.adminUser.update({ where: { id: t.userId }, data: { passwordHash: await this.hashPassword(password), passwordChangedAt: new Date() } }),
    ])
    await this.audit.record({ action: 'auth.invite_accepted', actor: t.user, req })
    return { ok: true }
  }

  // -------------------------------------------------------------------------
  // Two-factor (TOTP)
  // -------------------------------------------------------------------------

  async setupTotp(userId: string) {
    const u = await this.prisma.adminUser.findUniqueOrThrow({ where: { id: userId } })
    if (u.totpEnabled) throw new ForbiddenException('Two-factor authentication is already on')
    const secret = authenticator.generateSecret()
    await this.prisma.adminUser.update({ where: { id: userId }, data: { totpSecretEnc: encrypt(secret) } })
    const otpauth = authenticator.keyuri(u.email, 'Portfolio Admin', secret)
    return { otpauth, qr: await QRCode.toDataURL(otpauth), secret }
  }

  async enableTotp(userId: string, code: string, req: Request) {
    const u = await this.prisma.adminUser.findUniqueOrThrow({ where: { id: userId } })
    if (!u.totpSecretEnc || !authenticator.check(code, decrypt(u.totpSecretEnc))) throw new UnauthorizedException('Incorrect code')
    await this.prisma.adminUser.update({ where: { id: userId }, data: { totpEnabled: true } })
    await this.audit.record({ action: 'auth.2fa_enabled', actor: u, req })
    return this.me(userId)
  }

  async disableTotp(userId: string, req: Request) {
    const u = await this.prisma.adminUser.update({ where: { id: userId }, data: { totpEnabled: false, totpSecretEnc: null } })
    await this.audit.record({ action: 'auth.2fa_disabled', actor: u, req })
    return this.me(userId)
  }
}
