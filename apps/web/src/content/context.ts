import type { PublicBundle } from '@pg/shared'
import { createContext, useContext } from 'react'
import type { PublicSettings } from './api'
import { staticBundle } from './staticBundle'

export type ContentSource = 'static' | 'cache' | 'api' | 'preview'
export type PreviewState = 'off' | 'loading' | 'active' | 'expired'

export interface ContentValue {
  bundle: PublicBundle
  source: ContentSource
  preview: PreviewState
  /** Public settings from the API; null until known (or when there is no API). */
  settings: PublicSettings | null
  /** Called by the error boundary when a CMS bundle fails to render. */
  fallBackToStatic: () => void
}

export const ContentContext = createContext<ContentValue>({
  bundle: staticBundle(),
  source: 'static',
  preview: 'off',
  settings: null,
  fallBackToStatic: () => {},
})

export const useContent = () => useContext(ContentContext)
