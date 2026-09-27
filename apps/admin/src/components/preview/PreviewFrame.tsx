import { useCallback, useEffect, useRef, useState } from 'react'
import { ExternalLink, Monitor, RefreshCw, Smartphone, Tablet } from 'lucide-react'
import { errorMessage } from '../../lib/api'
import { cn } from '../../lib/format'
import { usePreviewToken } from '../../lib/queries'
import { Button, Segmented, useToast } from '../ui'

export type Device = 'desktop' | 'tablet' | 'mobile'
const WIDTHS: Record<Device, number | null> = { desktop: null, tablet: 768, mobile: 390 }

/** Open the draft site in a new tab via a short-lived preview token. */
export function usePreviewWebsite() {
  const token = usePreviewToken()
  const toast = useToast()
  return {
    open: async () => {
      // Open synchronously so pop-up blockers allow it, then navigate.
      const win = window.open('about:blank', '_blank')
      try {
        const r = await token.mutateAsync()
        if (win) {
          win.opener = null
          win.location.href = r.url
        } else window.open(r.url, '_blank', 'noopener,noreferrer')
      } catch (err) {
        win?.close()
        toast.fromError(err, 'Could not create a preview link')
      }
    },
    pending: token.isPending,
  }
}

/**
 * Live preview of the public site built from drafts. `version` changes
 * (e.g. after a draft save) reload the frame.
 */
export function PreviewFrame({ version, className, height = 'h-[72vh]' }: { version?: unknown; className?: string; height?: string }) {
  const token = usePreviewToken()
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [device, setDevice] = useState<Device>('desktop')
  const [nonce, setNonce] = useState(0)
  const issuedAt = useRef(0)
  const { mutateAsync } = token

  const load = useCallback(async () => {
    setError(null)
    try {
      // Tokens live 15 minutes; reuse one for 10.
      if (!url || Date.now() - issuedAt.current > 10 * 60_000) {
        const r = await mutateAsync()
        issuedAt.current = Date.now()
        setUrl(r.url)
      }
      setNonce((n) => n + 1)
    } catch (err) {
      setError(err)
    }
  }, [mutateAsync, url])

  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      load()
      return
    }
    const t = setTimeout(load, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  const w = WIDTHS[device]
  const src = url ? `${url}${url.includes('?') ? '&' : '?'}_r=${nonce}` : null

  return (
    <div className={cn('flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-card', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
        <span className="eyebrow">Live preview · draft</span>
        <div className="flex items-center gap-1.5">
          <Segmented
            size="sm"
            aria-label="Preview width"
            value={device}
            onChange={setDevice}
            options={[
              { value: 'desktop', label: <span className="sr-only">Desktop</span>, icon: <Monitor className="h-3.5 w-3.5" />, title: 'Desktop' },
              { value: 'tablet', label: <span className="sr-only">Tablet 768</span>, icon: <Tablet className="h-3.5 w-3.5" />, title: 'Tablet (768px)' },
              { value: 'mobile', label: <span className="sr-only">Mobile 390</span>, icon: <Smartphone className="h-3.5 w-3.5" />, title: 'Mobile (390px)' },
            ]}
          />
          <Button size="icon-sm" variant="ghost" onClick={load} aria-label="Refresh preview" disabled={token.isPending}>
            <RefreshCw className={cn('h-3.5 w-3.5', token.isPending && 'animate-spin')} />
          </Button>
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-fg" aria-label="Open preview in new tab">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
      <div className={cn('relative overflow-auto bg-[#07080c]', height)}>
        {error ? (
          <div className="grid h-full place-items-center p-6 text-center">
            <div>
              <p className="text-sm text-fg">Preview unavailable</p>
              <p className="mt-1 text-xs text-muted">{errorMessage(error)}</p>
              <Button size="sm" className="mt-3" onClick={load}>
                Retry
              </Button>
            </div>
          </div>
        ) : src ? (
          <div className="mx-auto h-full transition-[width] duration-300" style={{ width: w ? `${w}px` : '100%' }}>
            <iframe
              key={src}
              src={src}
              title="Website preview"
              className="h-full w-full border-0 bg-white"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="grid h-full place-items-center text-xs text-muted">Preparing preview…</div>
        )}
        {w && <span className="absolute right-2 top-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white/80">{w}px</span>}
      </div>
    </div>
  )
}
