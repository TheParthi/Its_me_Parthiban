import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { MessageStatus } from '@pg/shared'
import { apiRaw, del, get, patch } from '../../lib/api'
import type { ContactMessage, MessagesResponse } from '../../lib/types'

export interface MessageListParams {
  status?: MessageStatus
  q?: string
  page: number
  pageSize: number
}

export const messageKeys = {
  all: ['messages'] as const,
  list: (p: MessageListParams) => ['messages', 'list', p] as const,
  item: (id: string) => ['messages', 'item', id] as const,
}

export function useMessages(p: MessageListParams) {
  return useQuery({
    queryKey: messageKeys.list(p),
    queryFn: ({ signal }) => get<MessagesResponse>('/admin/messages', { ...p }, signal),
    placeholderData: keepPreviousData,
  })
}

/** Opening a message marks it read on the server, so the list is refreshed afterwards. */
export function useMessage(id: string | null) {
  const qc = useQueryClient()
  return useQuery({
    queryKey: messageKeys.item(id ?? ''),
    enabled: !!id,
    queryFn: async ({ signal }) => {
      const m = await get<ContactMessage>(`/admin/messages/${id}`, undefined, signal)
      qc.invalidateQueries({ queryKey: ['messages', 'list'] })
      return m
    },
  })
}

export function useMessageActions() {
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: messageKeys.all })

  const setStatus = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: MessageStatus }) => settle(ids, (id) => patch<ContactMessage>(`/admin/messages/${id}`, { status })),
    onSettled: refresh,
  })

  const remove = useMutation({
    mutationFn: async (ids: string[]) => settle(ids, (id) => del(`/admin/messages/${id}`)),
    onSuccess: (_r, ids) => ids.forEach((id) => qc.removeQueries({ queryKey: messageKeys.item(id) })),
    onSettled: refresh,
  })

  const exportCsv = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await apiRaw('/admin/messages/export', { method: 'POST', body: { ids }, headers: { Accept: 'text/csv' } })
      return res.blob()
    },
  })

  return { setStatus, remove, exportCsv }
}

/** Runs one request per id; throws if any failed, reporting how many succeeded. */
async function settle<T>(ids: string[], fn: (id: string) => Promise<T>) {
  const results = await Promise.allSettled(ids.map(fn))
  const failed = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[]
  if (failed.length) {
    const ok = ids.length - failed.length
    const first = failed[0].reason
    const err = first instanceof Error ? first : new Error(String(first))
    if (ids.length > 1) err.message = `${failed.length} of ${ids.length} failed${ok ? ` (${ok} succeeded)` : ''}: ${err.message}`
    throw err
  }
  return ids.length
}
