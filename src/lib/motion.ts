import { useEffect, useState } from 'react'

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

export const useReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)')
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
