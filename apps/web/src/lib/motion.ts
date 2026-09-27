import { useEffect, useState, useSyncExternalStore } from 'react'

export const EASE = [0.16, 1, 0.3, 1] as const

function useMedia(query: string, fallback = false) {
  const [match, setMatch] = useState(() =>
    typeof window === 'undefined' ? fallback : window.matchMedia(query).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatch(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return match
}

// Site-wide motion preference from the CMS appearance ('reduced' / 'off' are
// treated exactly like the OS-level prefers-reduced-motion setting).
let forcedReduced = false
const listeners = new Set<() => void>()
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function setMotionPreference(mode: 'full' | 'reduced' | 'off') {
  document.documentElement.dataset.motion = mode
  const next = mode !== 'full'
  if (next === forcedReduced) return
  forcedReduced = next
  listeners.forEach((l) => l())
}

/** Non-hook check for imperative code (GSAP, Lenis). */
export const isReducedMotion = () =>
  forcedReduced || (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)

/** True when the CMS forces reduced motion, regardless of the OS setting. */
export const useForcedReducedMotion = () => useSyncExternalStore(subscribe, () => forcedReduced, () => false)

export const useReducedMotion = () => {
  const os = useMedia('(prefers-reduced-motion: reduce)')
  return useForcedReducedMotion() || os
}
export const useFinePointer = () => useMedia('(hover: hover) and (pointer: fine)')
export const useIsDesktop = () => useMedia('(min-width: 1024px)')
export const useIsMobile = () => useMedia('(max-width: 767px)')

/** True when the device can comfortably render the WebGL hero. */
export function useCanRender3D() {
  const desktop = useMedia('(min-width: 768px)')
  const reduced = useReducedMotion()
  const [webgl] = useState(() => {
    try {
      const c = document.createElement('canvas')
      return !!(c.getContext('webgl2') || c.getContext('webgl'))
    } catch {
      return false
    }
  })
  return desktop && !reduced && webgl
}
