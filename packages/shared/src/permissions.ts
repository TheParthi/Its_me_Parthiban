// Role-based access control. The API enforces these on every protected
// route; the admin UI only uses them to decide what to show.

export const PERMISSIONS = [
  'content:read', // read drafts of profile, projects, skills, experience…
  'content:write', // create / edit drafts
  'content:publish', // publish, unpublish, schedule, restore versions
  'content:delete', // delete / trash content
  'media:read',
  'media:write',
  'media:delete',
  'site:write', // homepage builder, appearance, SEO
  'analytics:read', // aggregated reports
  'analytics:sessions', // session explorer and live visitors
  'messages:read',
  'messages:write',
  'users:read',
  'users:write', // invite, change roles, disable
  'security:read',
  'security:write', // revoke sessions, lockout policy, enforce 2FA
  'audit:read',
  'settings:read',
  'settings:write',
  'backup:export',
  'backup:restore',
] as const

export type Permission = (typeof PERMISSIONS)[number]

export const ROLES = ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'ANALYST'] as const
export type RoleName = (typeof ROLES)[number]

export const ROLE_PERMISSIONS: Record<RoleName, readonly Permission[]> = {
  SUPER_ADMIN: PERMISSIONS,
  ADMIN: [
    'content:read',
    'content:write',
    'content:publish',
    'content:delete',
    'media:read',
    'media:write',
    'media:delete',
    'site:write',
    'analytics:read',
    'analytics:sessions',
    'messages:read',
    'messages:write',
    'users:read',
    'security:read',
    'audit:read',
    'settings:read',
    'backup:export',
  ],
  EDITOR: ['content:read', 'content:write', 'media:read', 'media:write'],
  ANALYST: ['analytics:read', 'analytics:sessions'],
}

export const ROLE_LABELS: Record<RoleName, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  EDITOR: 'Editor',
  ANALYST: 'Analyst',
}

export function can(perms: readonly string[] | undefined, p: Permission) {
  return !!perms?.includes(p)
}
