import { ExecutionContext, SetMetadata, createParamDecorator } from '@nestjs/common'
import type { Permission } from '@pg/shared'

export const IS_PUBLIC = 'isPublic'
/** Route needs no admin session (public portfolio API, login, health). */
export const Public = () => SetMetadata(IS_PUBLIC, true)

export const PERMS = 'permissions'
/** All listed permissions are required. Enforced by PermissionsGuard. */
export const RequirePermissions = (...p: Permission[]) => SetMetadata(PERMS, p)

export const RECENT_AUTH = 'recentAuth'
/** Requires a password re-check within the last few minutes. */
export const RequireRecentAuth = () => SetMetadata(RECENT_AUTH, true)

export interface RequestUser {
  id: string
  email: string
  name: string
  role: string
  permissions: string[]
  sessionId: string
  /** Epoch ms of the last password confirmation in this session. */
  authAt: number
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): RequestUser => ctx.switchToHttp().getRequest().user,
)
