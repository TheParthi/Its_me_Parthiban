import type { PublicBundle } from '@pg/shared'
import { useCallback, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import { configureAnalytics } from '../lib/analytics'
import { API_URL, fetchBundle, fetchPreview, fetchSettings, normalizeBundle, parseSettings, type PublicSettings } from './api'
import { applyAppearance } from './appearance'
import { ContentContext, type ContentSource, type PreviewState } from './context'
import { applySeo } from './seo'
import { staticBundle } from './staticBundle'

const BUNDLE_KEY = 'pg:bundle:v1'
const SETTINGS_KEY = 'pg:settings:v1'

function readCache<T>(key: string, parse: (v: unknown) => T | null): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? parse(JSON.parse(raw)) : null
  } catch {
    return null
  }
}
function writeCache(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota or storage disabled — caching is optional */
  }
}
function clearCache(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

function previewToken(): string | null {
  try {
    const t = new URLSearchParams(window.location.search).get('preview')
    return t && t.length <= 4096 ? t : null
  } catch {
    return null
  }
}

interface State {
  bundle: PublicBundle
  source: ContentSource
}

/** First render: the last good published bundle if we have one, else the static data. Never blank. */
function initialState(): State {
  if (API_URL) {
    const cached = readCache(BUNDLE_KEY, normalizeBundle)
    if (cached) return { bundle: cached, source: 'cache' }
  }
  return { bundle: staticBundle(), source: 'static' }
}

/**
 * Stale-while-revalidate content: renders the cached (or static) bundle
 * synchronously, then fetches the published bundle — or a draft preview when
 * the URL carries ?preview=<token> — without blocking first paint.
 */
export function ContentProvider({ children }: { children: ReactNode }) {
  const token = useMemo(() => (API_URL ? previewToken() : null), [])
  const [state, setState] = useState<State>(initialState)
  const [preview, setPreview] = useState<PreviewState>(token ? 'loading' : 'off')
  const [settings, setSettings] = useState<PublicSettings | null>(() =>
    API_URL && !token ? readCache(SETTINGS_KEY, (v) => parseSettings(v)) : null,
  )

  useEffect(() => {
    if (!API_URL) {
      configureAnalytics(null, { preview: false })
      return
    }
    let alive = true

    const loadPublished = () =>
      fetchBundle()
        .then((b) => {
          if (!alive) return
          if (!token) writeCache(BUNDLE_KEY, b)
          setState((s) => (s.source === 'preview' ? s : { bundle: b, source: 'api' }))
        })
        .catch(() => {
          /* keep cached/static content */
        })

    if (token) {
      fetchPreview(token)
        .then((b) => {
          if (!alive) return
          setState({ bundle: b, source: 'preview' }) // never cached
          setPreview('active')
        })
        .catch(() => {
          if (!alive) return
          setPreview('expired')
          void loadPublished()
        })
    } else {
      void loadPublished()
    }

    fetchSettings()
      .then((s) => {
        if (!alive) return
        if (!token) writeCache(SETTINGS_KEY, s)
        setSettings(s)
        configureAnalytics(s, { preview: !!token })
      })
      .catch(() => {
        if (!alive) return
        // Fall back to the last known settings; with none, analytics stays off
        // and the contact form keeps using mailto.
        const cached = token ? null : readCache(SETTINGS_KEY, (v) => parseSettings(v))
        configureAnalytics(cached, { preview: !!token })
      })

    return () => {
      alive = false
    }
  }, [token])

  // Before paint, so a cached custom theme never flashes the default one.
  useLayoutEffect(() => {
    applyAppearance(state.bundle.appearance)
  }, [state.bundle.appearance])

  useEffect(() => {
    applySeo(state.bundle, { preview: !!token })
  }, [state.bundle, token])

  const fallBackToStatic = useCallback(() => {
    clearCache(BUNDLE_KEY)
    setState({ bundle: staticBundle(), source: 'static' })
  }, [])

  const value = useMemo(
    () => ({ bundle: state.bundle, source: state.source, preview, settings, fallBackToStatic }),
    [state, preview, settings, fallBackToStatic],
  )
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
}
