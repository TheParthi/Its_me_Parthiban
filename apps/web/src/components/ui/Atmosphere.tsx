import { motion, useSpring } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useContent } from '../../content/context'
import { useFinePointer, useReducedMotion } from '../../lib/motion'

/** Grain, cursor-following light and (on desktop) a custom cursor. */
export function Atmosphere() {
  const { bundle } = useContent()
  const fine = useFinePointer()
  const reduced = useReducedMotion()
  const grain = bundle.appearance.showGrain !== false && !reduced
  const showCursor = fine && !reduced

  const x = useSpring(-100, { stiffness: 500, damping: 40, mass: 0.3 })
  const y = useSpring(-100, { stiffness: 500, damping: 40, mass: 0.3 })
  const [hover, setHover] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const move = (e: PointerEvent) => {
      root.style.setProperty('--mx', `${e.clientX}px`)
      root.style.setProperty('--my', `${e.clientY}px`)
      x.set(e.clientX)
      y.set(e.clientY)
    }
    const over = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null
      setHover(!!t?.closest('a, button, [data-cursor], input, textarea, select, [role="button"]'))
    }
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerover', over, { passive: true })
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerover', over)
    }
  }, [x, y])

  useEffect(() => {
    document.body.classList.toggle('has-cursor', showCursor)
  }, [showCursor])

  return (
    <>
      {fine && <div className="cursor-light" aria-hidden />}
      {grain && <div className="grain" aria-hidden />}
      {showCursor && (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed left-0 top-0 z-[70] h-0 w-0 mix-blend-difference"
          style={{ x, y }}
        >
          <motion.div
            className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white"
            animate={{
              width: hover ? 44 : 10,
              height: hover ? 44 : 10,
              backgroundColor: hover ? 'rgba(255,255,255,0)' : 'rgba(255,255,255,1)',
            }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          />
        </motion.div>
      )}
    </>
  )
}
