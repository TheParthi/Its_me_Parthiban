import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { navItems, profile } from '../../data/profile'
import { EASE } from '../../lib/motion'
import { lockScroll, scrollToId } from '../../lib/scroll'
import { Monogram } from '../ui/Icons'

// Sections that are not in the nav highlight their closest nav item.
const SECTION_TO_NAV: Record<string, string> = { lab: 'projects', exploring: 'experience' }

function useActiveSection() {
  const [active, setActive] = useState<string>('home')
  useEffect(() => {
    const on = () => {
      const mark = window.innerHeight * 0.45
      let current = 'home'
      document.querySelectorAll<HTMLElement>('main > section[id]').forEach((el) => {
        if (el.getBoundingClientRect().top <= mark) current = el.id
      })
      setActive(SECTION_TO_NAV[current] ?? current)
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return active
}

export function Nav() {
  const active = useActiveSection()
  const [compact, setCompact] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const on = () => setCompact(window.scrollY > 40)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  useEffect(() => {
    lockScroll(open)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open])

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    setOpen(false)
    // Let the menu close before scrolling so the target position is stable.
    setTimeout(() => scrollToId(id), open ? 350 : 0)
  }

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-lg focus:bg-fg focus:px-4 focus:py-2 focus:text-ink"
      >
        Skip to content
      </a>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4">
        <motion.nav
          aria-label="Primary"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, ease: EASE, delay: 0.2 }}
          className={`pointer-events-auto mt-4 flex w-full items-center justify-between gap-4 rounded-full border transition-all duration-500 ease-out-expo ${
            compact
              ? 'max-w-3xl border-line bg-ink/70 py-1.5 pl-2 pr-1.5 backdrop-blur-xl'
              : 'max-w-6xl border-transparent bg-transparent py-3 pl-1 pr-1'
          }`}
        >
          <a href="#home" onClick={go('home')} className="flex items-center gap-3" aria-label="Back to top">
            <Monogram size={compact ? 32 : 38} />
            <span
              className={`font-mono text-xs tracking-wider text-mute transition-opacity duration-300 ${
                compact ? 'hidden' : 'hidden sm:inline'
              }`}
            >
              {profile.name.toLowerCase()}
            </span>
          </a>

          <ul className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={go(item.id)}
                  aria-current={active === item.id ? 'true' : undefined}
                  className={`relative block rounded-full px-3.5 py-2 text-[13px] transition-colors duration-300 ${
                    active === item.id ? 'text-fg' : 'text-mute hover:text-fg'
                  }`}
                >
                  {active === item.id && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 -z-10 rounded-full border border-line-2 bg-ink-3"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    >
                      <span className="absolute -bottom-px left-1/2 h-px w-4 -translate-x-1/2 bg-cyan" />
                    </motion.span>
                  )}
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <a
              href={profile.resumeUrl}
              target="_blank"
              rel="noopener"
              className="hidden rounded-full bg-fg px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-white sm:inline-block"
            >
              Resume
            </a>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
              className="relative grid h-10 w-10 place-items-center rounded-full border border-line-2 bg-ink-2 md:hidden"
            >
              <motion.span
                className="absolute h-px w-4 bg-fg"
                animate={open ? { rotate: 45, y: 0 } : { rotate: 0, y: -3 }}
                transition={{ duration: 0.4, ease: EASE }}
              />
              <motion.span
                className="absolute h-px w-4 bg-fg"
                animate={open ? { rotate: -45, y: 0 } : { rotate: 0, y: 3 }}
                transition={{ duration: 0.4, ease: EASE }}
              />
            </button>
          </div>
        </motion.nav>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-0 z-40 flex flex-col justify-between bg-ink px-6 pb-10 pt-28 md:hidden"
            initial={{ clipPath: 'circle(0% at calc(100% - 44px) 40px)' }}
            animate={{ clipPath: 'circle(150% at calc(100% - 44px) 40px)' }}
            exit={{ clipPath: 'circle(0% at calc(100% - 44px) 40px)' }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <div className="bg-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(circle_at_80%_10%,#000,transparent_70%)]" />
            <ul className="relative space-y-1">
              {navItems.map((item, i) => (
                <li key={item.id} className="overflow-hidden">
                  <motion.a
                    href={`#${item.id}`}
                    onClick={go(item.id)}
                    className="flex items-baseline gap-4 py-2 font-display text-5xl font-semibold tracking-tight"
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ duration: 0.6, ease: EASE, delay: 0.15 + i * 0.05 }}
                  >
                    <span className="font-mono text-xs text-cyan">0{i + 1}</span>
                    <span className={active === item.id ? 'text-fg' : 'text-mute'}>{item.label}</span>
                  </motion.a>
                </li>
              ))}
            </ul>
            <motion.div
              className="relative flex items-center justify-between border-t border-line pt-6 font-mono text-xs text-mute"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.5 } }}
              exit={{ opacity: 0 }}
            >
              <span>{profile.location}</span>
              <a href={profile.resumeUrl} target="_blank" rel="noopener" className="text-fg underline underline-offset-4">
                Resume ↗
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
