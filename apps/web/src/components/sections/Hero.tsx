import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion'
import { FileDown } from 'lucide-react'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useContent } from '../../content/context'
import { resumeHref } from '../../content/format'
import { headingSize, SectionBackdrop, useSection } from '../../content/sections'
import { EASE, useCanRender3D, useReducedMotion } from '../../lib/motion'
import { scrollToId } from '../../lib/scroll'
import { CoreFallback } from '../three/CoreFallback'
import { Button } from '../ui/Button'

const CoreScene = lazy(() => import('../three/CoreScene'))

function RotatingRole({ roles }: { roles: string[] }) {
  const [i, setI] = useState(0)
  const reduced = useReducedMotion()
  useEffect(() => {
    if (reduced || roles.length < 2) return
    const t = setInterval(() => setI((n) => (n + 1) % roles.length), 3200)
    return () => clearInterval(t)
  }, [reduced, roles.length])
  const role = roles[i % roles.length] ?? ''

  return (
    <div className="relative h-[1.3em] min-w-0 flex-1 overflow-hidden" aria-live="polite">
      <span className="sr-only">{roles.join(', ')}</span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={role} className="absolute left-0 top-0 flex whitespace-nowrap" aria-hidden>
          {role.split('').map((ch, j) => (
            <motion.span
              key={j}
              className="inline-block"
              initial={{ y: '110%', opacity: 0, filter: 'blur(6px)' }}
              animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
              exit={{ y: '-110%', opacity: 0, filter: 'blur(6px)', transition: { duration: 0.28, ease: EASE, delay: j * 0.006 } }}
              transition={{ duration: 0.55, ease: EASE, delay: j * 0.018 }}
            >
              {ch === ' ' ? ' ' : ch}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}

export function Hero() {
  const { bundle } = useContent()
  const profile = bundle.profile
  const view = useSection('hero')
  const resume = resumeHref(bundle)
  const can3D = useCanRender3D() && bundle.appearance.show3dHero !== false
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const visualY = useTransform(scrollYProgress, [0, 1], ['0%', '25%'])
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '-12%'])
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  const line = (delay: number) => ({
    initial: { y: '110%' },
    animate: { y: 0 },
    transition: { duration: 1.2, ease: EASE, delay },
  })

  return (
    <section ref={ref} id="home" data-bg={view.background} className="relative isolate flex min-h-[100svh] items-center overflow-hidden pb-24 pt-32">
      {/* Ambient light and grid */}
      <div aria-hidden data-deco className="bg-grid absolute inset-0 -z-10 opacity-50 [mask-image:radial-gradient(ellipse_70%_60%_at_60%_40%,#000_20%,transparent_75%)]" />
      <div aria-hidden data-deco className="absolute -right-40 top-10 -z-10 h-[620px] w-[620px] rounded-full bg-violet/20 blur-[140px]" />
      <div aria-hidden data-deco className="absolute -left-40 bottom-0 -z-10 h-[420px] w-[420px] rounded-full bg-cyan/10 blur-[140px]" />
      <SectionBackdrop view={view} />

      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-[1.15fr_1fr]">
        <motion.div style={{ y: textY, opacity: fade }} className="relative z-10">
          {(view.eyebrow || profile.availability.label) && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.3 }}
              className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-line bg-ink-2/60 px-3.5 py-1.5 font-mono text-[11px] tracking-[0.18em] text-mute backdrop-blur"
            >
              <span className="relative flex h-2 w-2">
                {profile.availability.available && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                )}
                <span className={`relative inline-flex h-2 w-2 rounded-full ${profile.availability.available ? 'bg-emerald-400' : 'bg-dim'}`} />
              </span>
              {(view.eyebrow || profile.availability.label).toUpperCase()}
            </motion.div>
          )}

          <h1 className={`font-display ${headingSize.hero} font-semibold leading-[0.9] tracking-[-0.045em]`}>
            <span className="block overflow-hidden pb-[0.06em]">
              <motion.span className="block" {...line(0.35)}>
                {view.heading || "Hi, I'm"}
              </motion.span>
            </span>
            <span className="block overflow-hidden pb-[0.1em]">
              <motion.span className="text-gradient block" {...line(0.5)}>
                {profile.firstName}.
              </motion.span>
            </span>
          </h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1 }}
            className="mt-6 flex items-center gap-3 font-display text-[clamp(1rem,4.2vw,2rem)] font-medium text-fg/90 sm:gap-4 lg:text-[clamp(1.25rem,2.6vw,2rem)]"
          >
            <span className="h-px w-6 shrink-0 bg-cyan sm:w-10" />
            <RotatingRole roles={profile.hero.roles} />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE, delay: 1.15 }}
            className="mt-7 max-w-xl text-[17px] leading-relaxed text-mute"
          >
            {view.description || profile.hero.description || profile.shortBio}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE, delay: 1.3 }}
            className="mt-10 flex flex-wrap items-center gap-3"
          >
            <Button
              href="#projects"
              data-ev="CTA_CLICK"
              data-ev-target="hero-explore"
              onClick={(e) => {
                e.preventDefault()
                scrollToId('projects')
              }}
            >
              Explore My Work
            </Button>
            <Button variant="ghost" href={resume} download data-ev="RESUME_DOWNLOAD" data-ev-target="hero" icon={<FileDown className="h-4 w-4" />}>
              Download Resume
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          style={{ y: visualY }}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.6, ease: EASE, delay: 0.4 }}
          className="relative mx-auto aspect-square w-full max-w-[560px] lg:-mr-10"
          aria-hidden
        >
          {can3D ? (
            <Suspense fallback={<CoreFallback />}>
              <CoreScene />
            </Suspense>
          ) : (
            <CoreFallback />
          )}
          {/* Instrument readouts around the core */}
          <div className="pointer-events-none absolute left-2 top-8 font-mono text-[10px] leading-5 text-dim">
            <div>CORE://{profile.firstName.toLowerCase().replace(/[^a-z0-9]+/g, '')}</div>
            <div>
              status <span className="text-emerald-400">online</span>
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-10 right-2 text-right font-mono text-[10px] leading-5 text-dim">
            <div>build · ship · iterate</div>
            <div>
              loop <span className="text-cyan">∞</span>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.button
        type="button"
        onClick={() => scrollToId('about')}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 1 }}
        className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 font-mono text-[10px] tracking-[0.3em] text-dim"
        aria-label="Scroll to about"
      >
        SCROLL
        <span className="relative flex h-10 w-px overflow-hidden bg-line">
          <motion.span
            className="absolute left-0 top-0 h-3 w-px bg-cyan"
            animate={{ y: [-12, 40] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </span>
      </motion.button>
    </section>
  )
}
