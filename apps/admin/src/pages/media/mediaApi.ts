import { useMutation, useQueryClient } from '@tanstack/react-query'
import { patch } from '../../lib/api'
import { replaceMedia } from '../../lib/upload'
import { MEDIA_CATEGORIES, type MediaAsset, type MediaCategory } from '../../lib/types'
import { ApiError } from '../../lib/api'

export const CATEGORY_LABELS: Record<MediaCategory, string> = {
  PROFILE: 'Profile',
  PROJECT: 'Project',
  ICON: 'Icon',
  BACKGROUND: 'Background',
  DOCUMENT: 'Document',
  OTHER: 'Other',
}

export const categoryOptions = MEDIA_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))

export const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/gif,application/pdf'

export const isPdf = (m: Pick<MediaAsset, 'mimeType'>) => m.mimeType === 'application/pdf'

/** Friendly text for upload failures (415 unsupported, 413 too large). */
export function uploadErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 415) return err.message || 'Unsupported file type — use JPEG, PNG, WebP, AVIF, GIF or PDF.'
    if (err.status === 413) return 'File is too large — the limit is 10 MB.'
    if (err.status === 0) return 'Cannot reach the server.'
    return err.message || `Upload failed (${err.status})`
  }
  if (err instanceof Error) return err.message
  return 'Upload failed'
}

export interface MediaPatch {
  alt?: string
  fileName?: string
  category?: MediaCategory
}

export function useUpdateMedia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: MediaPatch }) => patch<MediaAsset>(`/admin/media/${id}`, body),
    onSuccess: (m) => {
      qc.setQueryData(['media', 'item', m.id], m)
      qc.invalidateQueries({ queryKey: ['media'] })
    },
  })
}

export function useReplaceMedia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file, onProgress }: { id: string; file: File; onProgress?: (f: number) => void }) => replaceMedia(id, file, { onProgress }),
    onSuccess: (m) => {
      qc.setQueryData(['media', 'item', m.id], m)
      qc.invalidateQueries({ queryKey: ['media'] })
    },
  })
}
