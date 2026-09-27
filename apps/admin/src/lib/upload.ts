import { API_BASE, ApiError, authHeader, refreshSession } from './api'
import type { MediaAsset, MediaCategory } from './types'

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'] as const
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export function validateImageFile(f: File): string | null {
  if (!(IMAGE_TYPES as readonly string[]).includes(f.type)) return `${f.name}: use JPEG, PNG, WebP, AVIF or GIF`
  if (f.size > MAX_UPLOAD_BYTES) return `${f.name}: larger than 10 MB`
  return null
}

export function validateMediaFile(f: File): string | null {
  if (f.type === 'application/pdf') return f.size > MAX_UPLOAD_BYTES ? `${f.name}: larger than 10 MB` : null
  return validateImageFile(f)
}

function xhrSend(url: string, form: FormData, onProgress?: (fraction: number) => void, signal?: AbortSignal): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.withCredentials = true
    for (const [k, v] of Object.entries(authHeader())) xhr.setRequestHeader(k, v)
    xhr.setRequestHeader('Accept', 'application/json')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total)
    }
    xhr.onload = () => {
      let body: unknown = null
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : null
      } catch {
        body = xhr.responseText
      }
      resolve({ status: xhr.status, body })
    }
    xhr.onerror = () => reject(new ApiError(0, 'Upload failed — cannot reach the server'))
    xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'))
    signal?.addEventListener('abort', () => xhr.abort())
    xhr.send(form)
  })
}

async function uploadWithRetry(path: string, form: FormData, onProgress?: (f: number) => void, signal?: AbortSignal): Promise<MediaAsset> {
  let r = await xhrSend(`${API_BASE}${path}`, form, onProgress, signal)
  if (r.status === 401 && (await refreshSession())) {
    onProgress?.(0)
    r = await xhrSend(`${API_BASE}${path}`, form, onProgress, signal)
  }
  if (r.status < 200 || r.status >= 300) {
    const b = r.body as { message?: unknown } | null
    const msg = typeof b?.message === 'string' ? b.message : Array.isArray(b?.message) ? b.message.join(', ') : `Upload failed (${r.status})`
    throw new ApiError(r.status, msg, r.body)
  }
  onProgress?.(1)
  return r.body as MediaAsset
}

/** POST /admin/media (multipart: file, category, alt) with progress events. */
export function uploadMedia(
  file: File | Blob,
  opts: { category?: MediaCategory; alt?: string; fileName?: string; onProgress?: (f: number) => void; signal?: AbortSignal } = {},
) {
  const form = new FormData()
  form.append('file', file, opts.fileName ?? (file instanceof File ? file.name : 'upload.webp'))
  if (opts.category) form.append('category', opts.category)
  form.append('alt', opts.alt ?? '')
  return uploadWithRetry('/admin/media', form, opts.onProgress, opts.signal)
}

/** POST /admin/media/:id/replace (multipart). */
export function replaceMedia(id: string, file: File | Blob, opts: { fileName?: string; onProgress?: (f: number) => void } = {}) {
  const form = new FormData()
  form.append('file', file, opts.fileName ?? (file instanceof File ? file.name : 'upload.webp'))
  return uploadWithRetry(`/admin/media/${id}/replace`, form, opts.onProgress)
}

/** Re-encode an image (or a cropped region of it) to WebP in the browser. */
export async function compressToWebp(
  src: string,
  crop: { x: number; y: number; width: number; height: number } | null,
  opts: { maxWidth?: number; quality?: number; outWidth?: number; outHeight?: number } = {},
): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error('Could not read the image'))
    i.src = src
  })
  const area = crop ?? { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight }
  let w = opts.outWidth ?? area.width
  let h = opts.outHeight ?? area.height
  const maxW = opts.maxWidth ?? 2400
  if (!opts.outWidth && w > maxW) {
    h = Math.round((h * maxW) / w)
    w = maxW
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(w))
  canvas.height = Math.max(1, Math.round(h))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', opts.quality ?? 0.86))
  if (!blob) throw new Error('This browser cannot encode WebP')
  return blob
}
