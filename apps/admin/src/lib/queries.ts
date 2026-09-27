/**
 * Shared TanStack Query hooks. Page-specific hooks live next to their page;
 * anything reused by several pages (documents, projects, media, versions,
 * preview) lives here so invalidation keys stay consistent.
 */
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { Collection, ProjectAdmin } from '@pg/shared'
import { del, get, post, put, type QueryValue } from './api'
import { asList, asPaged, flattenAdmin, flattenList } from './normalize'
import type {
  CollectionAdmin,
  DocumentKey,
  DocumentResponse,
  MediaAsset,
  MediaUsage,
  Paged,
  PreviewToken,
  SkillAdmin,
  SkillCategory,
  VersionEntry,
  VersionSnapshot,
} from './types'

export const qk = {
  document: (key: DocumentKey) => ['document', key] as const,
  projects: (params?: Record<string, QueryValue>) => (params ? (['projects', params] as const) : (['projects'] as const)),
  project: (id: string) => ['project', id] as const,
  media: (params?: Record<string, QueryValue>) => (params ? (['media', 'list', params] as const) : (['media'] as const)),
  mediaItem: (id: string) => ['media', 'item', id] as const,
  mediaUsage: (id: string) => ['media', 'usage', id] as const,
  versions: (type: string, id: string) => ['versions', type, id] as const,
  version: (id: string) => ['version', id] as const,
  skillCategories: ['skill-categories'] as const,
  skills: ['skills'] as const,
  collection: (c: Collection) => ['collection', c] as const,
  settings: ['settings'] as const,
  system: ['settings', 'system'] as const,
  notifications: ['notifications'] as const,
  health: ['health'] as const,
}

// ---------------------------------------------------------------------------
// Singleton documents
// ---------------------------------------------------------------------------

export function useDocument<T>(key: DocumentKey) {
  return useQuery({
    queryKey: qk.document(key),
    queryFn: ({ signal }) => get<DocumentResponse<T>>(`/admin/documents/${key}`, undefined, signal),
  })
}

export function useDocumentMutations<T>(key: DocumentKey) {
  const qc = useQueryClient()
  const refresh = (d?: unknown) => {
    if (d && typeof d === 'object' && 'draft' in d) qc.setQueryData(qk.document(key), d)
    return qc.invalidateQueries({ queryKey: qk.document(key) })
  }
  const save = useMutation({
    mutationFn: (draft: T) => put<DocumentResponse<T>>(`/admin/documents/${key}`, draft),
    onSuccess: refresh,
  })
  const publish = useMutation({
    mutationFn: () => post<DocumentResponse<T>>(`/admin/documents/${key}/publish`),
    onSuccess: (d) => {
      refresh(d)
      qc.invalidateQueries({ queryKey: ['versions', key] })
    },
  })
  const discard = useMutation({
    mutationFn: () => post<DocumentResponse<T>>(`/admin/documents/${key}/discard`),
    onSuccess: refresh,
  })
  return { save, publish, discard }
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export function useProjects(params: { q?: string; status?: string; trash?: boolean } = {}) {
  const query = { q: params.q, status: params.status, trash: params.trash ? 'true' : undefined }
  return useQuery({
    queryKey: qk.projects(query),
    queryFn: async ({ signal }) => flattenList<ProjectAdmin>(await get<unknown>('/admin/projects', query, signal)),
  })
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: qk.project(id ?? ''),
    enabled: !!id,
    queryFn: async ({ signal }) => flattenAdmin<ProjectAdmin>(await get<unknown>(`/admin/projects/${id}`, undefined, signal)),
  })
}

export function invalidateProjects(qc: QueryClient, id?: string) {
  qc.invalidateQueries({ queryKey: ['projects'] })
  if (id) qc.invalidateQueries({ queryKey: qk.project(id) })
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

export interface MediaQuery {
  q?: string
  category?: string
  type?: 'image' | 'document' | ''
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export function useMediaList(params: MediaQuery, enabled = true) {
  const qc = useQueryClient()
  const query = { ...params } as Record<string, QueryValue>
  return useQuery({
    queryKey: qk.media(query),
    enabled,
    queryFn: async ({ signal }) => {
      const r = asPaged<MediaAsset>(await get<unknown>('/admin/media', query, signal))
      // Seed per-asset cache so pickers/thumbnails resolve ids without refetching.
      for (const m of r.items) qc.setQueryData(qk.mediaItem(m.id), m)
      return r as Paged<MediaAsset>
    },
    placeholderData: (prev) => prev,
  })
}

/**
 * Resolve a media id to its asset. The API has no `GET /admin/media/:id`, so
 * this uses the cache seeded by list queries and otherwise pages through the
 * library once (shared by every thumbnail via `libraryIndex`).
 */
export function useMediaAsset(id: string | null | undefined) {
  const qc = useQueryClient()
  return useQuery({
    queryKey: qk.mediaItem(id ?? ''),
    enabled: !!id,
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async () => {
      const all = await qc.fetchQuery({ queryKey: ['media', 'index'], queryFn: loadLibraryIndex, staleTime: 60_000 })
      for (const m of all) if (!qc.getQueryData(qk.mediaItem(m.id))) qc.setQueryData(qk.mediaItem(m.id), m)
      return all.find((m) => m.id === id) ?? null
    },
  })
}

async function loadLibraryIndex(): Promise<MediaAsset[]> {
  const out: MediaAsset[] = []
  for (let page = 1; page <= 10; page++) {
    const r = asPaged<MediaAsset>(await get<unknown>('/admin/media', { page, pageSize: 100 }))
    out.push(...r.items)
    if (out.length >= r.total || !r.items.length) break
  }
  return out
}

export function useMediaUsage(id: string | null | undefined) {
  return useQuery({
    queryKey: qk.mediaUsage(id ?? ''),
    enabled: !!id,
    queryFn: async ({ signal }) => asList<MediaUsage>(await get<unknown>(`/admin/media/${id}/usage`, undefined, signal)),
  })
}

export function useDeleteMedia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => del(`/admin/media/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['media'] }),
  })
}

// ---------------------------------------------------------------------------
// Versions
// ---------------------------------------------------------------------------

export function useVersions(entityType: string, entityId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: qk.versions(entityType, entityId ?? ''),
    enabled: enabled && !!entityId,
    queryFn: async ({ signal }) => asList<VersionEntry>(await get<unknown>(`/admin/versions/${entityType}/${entityId}`, undefined, signal)),
  })
}

export function useVersion(id: string | null) {
  return useQuery({
    queryKey: qk.version(id ?? ''),
    enabled: !!id,
    queryFn: ({ signal }) => get<VersionSnapshot>(`/admin/versions/item/${id}`, undefined, signal),
  })
}

export function useRestoreVersion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (versionId: string) => post<unknown>(`/admin/versions/item/${versionId}/restore`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['versions'] })
      qc.invalidateQueries({ queryKey: ['document'] })
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['project'] })
      qc.invalidateQueries({ queryKey: ['skills'] })
      qc.invalidateQueries({ queryKey: ['collection'] })
    },
  })
}

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------

export function usePreviewToken() {
  return useMutation({ mutationFn: () => post<PreviewToken>('/admin/preview-token') })
}

// ---------------------------------------------------------------------------
// Skills and collections (list reads shared with the Portfolio Editor hub)
// ---------------------------------------------------------------------------

export function useSkillCategories() {
  return useQuery({
    queryKey: qk.skillCategories,
    queryFn: async ({ signal }) => asList<SkillCategory>(await get<unknown>('/admin/skill-categories', undefined, signal)),
  })
}

export function useSkills(enabled = true) {
  return useQuery({
    queryKey: qk.skills,
    enabled,
    queryFn: async ({ signal }) => flattenList<SkillAdmin>(await get<unknown>('/admin/skills', undefined, signal)),
  })
}

export function useCollection<C extends Collection>(c: C, enabled = true) {
  return useQuery({
    queryKey: qk.collection(c),
    enabled,
    queryFn: async ({ signal }) => flattenList<CollectionAdmin<C>>(await get<unknown>(`/admin/${c}`, undefined, signal)),
  })
}
