import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'
import { IS_PUBLIC, PERMS, RECENT_AUTH, RequestUser } from '../common/decorators'
import { PrismaService } from '../prisma/prisma.service'
import { AuthService } from './auth.service'

const RECENT_AUTH_MS = 10 * 60_000

/**
 * Global guard: every route requires a valid admin access token unless it is
 * marked @Public(). Checks the session is still live on every request so
 * revocation takes effect immediately.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()])) return true
    const req = ctx.switchToHttp().getRequest<Request & { user?: RequestUser }>()
    const header = req.headers.authorization ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) throw new UnauthorizedException('Authentication required')

    let claims
    try {
      claims = this.auth.verifyAccess(token)
    } catch {
      throw new UnauthorizedException('Session expired')
    }
    const session = await this.prisma.adminSession.findUnique({
      where: { id: claims.sid },
      include: { user: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
    })
    if (!session || session.revokedAt || session.expiresAt < new Date() || session.userId !== claims.sub || session.user.disabled) {
      throw new UnauthorizedException('Session is no longer valid')
    }
    if (Date.now() - session.lastUsedAt.getTime() > 5 * 60_000) {
      await this.prisma.adminSession.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
    }
    // Permissions are read fresh so role changes apply immediately.
    req.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role.name,
      permissions: session.user.role.permissions.map((p) => p.permission.key),
      sessionId: session.id,
      authAt: claims.authAt,
    }
    return true
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext) {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()])) return true
    const user = ctx.switchToHttp().getRequest<{ user?: RequestUser }>().user
    const required = this.reflector.getAllAndOverride<string[]>(PERMS, [ctx.getHandler(), ctx.getClass()]) ?? []
    if (required.some((p) => !user?.permissions.includes(p))) {
      throw new ForbiddenException('You do not have permission to do this')
    }
    if (this.reflector.getAllAndOverride<boolean>(RECENT_AUTH, [ctx.getHandler(), ctx.getClass()])) {
      if (!user || Date.now() - user.authAt > RECENT_AUTH_MS) {
        throw new ForbiddenException({ message: 'Please confirm your password to continue', code: 'REAUTH_REQUIRED' })
      }
    }
    return true
  }
}

/**
 * CSRF defence for cookie-authenticated endpoints (/auth/refresh, /auth/logout):
 * a custom header forces a CORS preflight, which other origins cannot pass.
 */
@Injectable()
export class CsrfHeaderGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<Request>()
    if (req.headers['x-requested-with'] !== 'pg-admin') throw new ForbiddenException('Missing CSRF header')
    return true
  }
}
