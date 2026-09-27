import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { RoleName } from '@pg/shared'
import { del, get, patch, post } from '../../lib/api'
import type { AdminUserRow, AuditRow, InviteResult, RoleRow } from '../../lib/types'

export const userKeys = {
  all: ['users'] as const,
  list: ['users', 'list'] as const,
  roles: ['users', 'roles'] as const,
  activity: (id: string) => ['users', 'activity', id] as const,
}

export const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  SUPER_ADMIN: 'Full control, including users, security policy, settings and backup restore.',
  ADMIN: 'Manages content, media, messages and analytics; can view users, security and audit logs.',
  EDITOR: 'Edits drafts of portfolio content and uploads media. Cannot publish.',
  ANALYST: 'Read-only access to analytics reports and visitor sessions.',
}

export function useUsers() {
  return useQuery({ queryKey: userKeys.list, queryFn: ({ signal }) => get<AdminUserRow[]>('/admin/users', undefined, signal) })
}

export function useRoles() {
  return useQuery({ queryKey: userKeys.roles, queryFn: ({ signal }) => get<RoleRow[]>('/admin/users/roles', undefined, signal) })
}

export function useUserActivity(id: string | null, enabled: boolean) {
  return useQuery({
    queryKey: userKeys.activity(id ?? ''),
    enabled: !!id && enabled,
    queryFn: ({ signal }) => get<AuditRow[]>(`/admin/users/${id}/activity`, undefined, signal),
  })
}

export function useUserMutations() {
  const qc = useQueryClient()
  const onSettled = () => qc.invalidateQueries({ queryKey: userKeys.all })
  return {
    invite: useMutation({
      mutationFn: (b: { email: string; name: string; role: RoleName }) => post<InviteResult>('/admin/users', b),
      onSettled,
    }),
    update: useMutation({
      mutationFn: ({ id, ...b }: { id: string; role?: RoleName; disabled?: boolean; name?: string }) => patch<AdminUserRow>(`/admin/users/${id}`, b),
      onSettled,
    }),
    remove: useMutation({ mutationFn: (id: string) => del(`/admin/users/${id}`), onSettled }),
    revokeSessions: useMutation({ mutationFn: (id: string) => post<{ revoked: number }>(`/admin/users/${id}/revoke-sessions`), onSettled }),
  }
}
