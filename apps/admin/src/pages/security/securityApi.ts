import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { get, post } from '../../lib/api'
import type { SecurityOverview } from '../../lib/types'

export const securityKeys = { overview: ['security', 'overview'] as const }

export function useSecurityOverview() {
  return useQuery({
    queryKey: securityKeys.overview,
    queryFn: ({ signal }) => get<SecurityOverview>('/admin/security/overview', undefined, signal),
    refetchInterval: 60_000,
  })
}

export function useRevokeSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => post<{ ok: true }>(`/admin/security/sessions/${id}/revoke`),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: securityKeys.overview })
      qc.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
