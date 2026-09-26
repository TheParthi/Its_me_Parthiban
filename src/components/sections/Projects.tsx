import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Plus } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react'
import { archiveProjects, featuredProjects, type FeaturedProject, type PreviewKind } from '../../data/projects'
import { profile } from '../../data/profile'
import { EASE } from '../../lib/motion'
import { gsap, ScrollTrigger } from '../../lib/scroll'
import { DeliveryPreview } from '../previews/DeliveryPreview'
import { MobilityPreview } from '../previews/MobilityPreview'
import { SecurityPreview } from '../previews/SecurityPreview'
import { VisionPreview } from '../previews/VisionPreview'
import { Reveal, SectionLabel, SplitHeading } from '../ui/Reveal'
import { ProjectModal } from './ProjectModal'

const previews: Record<PreviewKind, ComponentType> = {
  mobility: MobilityPreview,
  delivery: DeliveryPreview,
  security: SecurityPreview,
  vision: VisionPreview,
}

function ProjectRow({ project, flip, onOpen }: { project: FeaturedProject; flip: boolean; onOpen: () => void }) {
  const frame = useRef<HTMLDivElement>(null)
  const Preview = previews[project.preview]

  // Cinematic entrance: the preview unmasks from an inset clip as it scrolls in.
  useEffect(() => {
    const el = frame.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { clipPath: 'inset(12% 8% 12% 8% round 32px)', scale: 0.94 },
        {
          clipPath: 'inset(0% 0% 0% 0% round 28px)',
          scale: 1,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top 90%', end: 'top 35%', scrub: 0.6 },
        },
      )
    })
    return () => ctx.revert()
  }, [])

  return (
    <article className="group/row relative grid items-center gap-8 lg:grid-cols-12 lg:gap-12" aria-labelledby={`p-${project.id}`}>
      {/* Preview */}
      <div className={`lg:col-span-8 ${flip ? 'lg:order-2' : ''}`}>
        <button
          type="button"
          onClick={onOpen}
          className="group relative block w-full text-left"
          aria-label={`Explore ${project.title}`}
          data-cursor="view"
        >
          <div ref={frame} className="relative aspect-[800/520] overflow-hidden rounded-[28px] border border-line bg-ink-2">
            <div className="h-full w-full transition-transform duration-[1.2s] ease-out-expo group-hover:scale-[1.035]">
              <Preview />
            </div>
            {/* Hover reveal: extra technical detail slides up */}
            <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-ink via-ink/90 to-transparent p-5 pt-16 transition-transform duration-700 ease-out-expo group-hover:translate-y-0 group-focus-visible:translate-y-0">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <ul className="flex max-w-[70%] flex-wrap gap-1.5">
                  {project.tech.slice(0, 6).map((t) => (
                    <li key={t} className="rounded-full border border-line-2 bg-ink/70 px-2.5 py-1 font-mono text-[10px] text-fg/80">
                      {t}
                    </li>
                  ))}
                </ul>
                <span className="inline-flex items-center gap-2 rounded-full bg-fg px-4 py-2 text-xs font-medium text-ink">
                  Explore Project <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Meta */}
      <div className={`relative lg:col-span-4 ${flip ? 'lg:order-1 lg:text-right' : ''}`}>
        <Reveal>
          <div
            className="pointer-events-none absolute -top-16 select-none font-display text-[9rem] font-bold leading-none tracking-tighter text-transparent opacity-40 [-webkit-text-stroke:1px_rgba(255,255,255,.12)] lg:-top-28 lg:text-[12rem]"
            style={flip ? { right: 0 } : { left: -8 }}
            aria-hidden
          >
            {project.index}
          </div>
          <p className="relative font-mono text-[11px] tracking-[0.14em] uppercase" style={{ color: project.accent }}>
            {project.category}
          </p>
          <h3 id={`p-${project.id}`} className="relative mt-4 overflow-hidden font-display text-5xl font-semibold tracking-[-0.04em] md:text-6xl">
            <span className="block transition-transform duration-700 ease-out-expo group-hover/row:-translate-y-full">{project.title}</span>
            <span
              className={`absolute top-full block transition-transform duration-700 ease-out-expo group-hover/row:-translate-y-full ${flip ? 'right-0' : 'left-0'}`}
              style={{ color: project.accent }}
              aria-hidden
            >
              {project.title}
            </span>
          </h3>
          <p className="relative mt-5 text-[15px] leading-relaxed text-mute">{project.description}</p>
          <div className={`mt-5 flex items-center gap-2 font-mono text-[11px] text-dim ${flip ? 'lg:justify-end' : ''}`}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: project.accent }} />
            {project.status}
          </div>
          <div className={`mt-8 flex flex-wrap gap-3 ${flip ? 'lg:justify-end' : ''}`}>
            <button
              type="button"
              onClick={onOpen}
              className="group/btn inline-flex items-center gap-2 rounded-full border border-line-2 px-5 py-2.5 text-sm transition-colors hover:border-fg hover:bg-fg hover:text-ink"
            >
              Explore Project
              <Plus className="h-4 w-4 transition-transform duration-500 group-hover/btn:rotate-90" />
            </button>
            {project.links[0] && (
              <a
                href={project.links[0].href}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-2.5 text-sm text-mute transition-colors hover:text-fg"
              >
                View Project <ArrowUpRight className="h-4 w-4" />
              </a>
            )}
          </div>
        </Reveal>
      </div>
    </article>
  )
}

function Archive() {
  const [open, setOpen] = useState<number | null>(null)
  // Accordion height changes shift later scroll triggers; keep them accurate.
  useEffect(() => {
    const t = setTimeout(() => ScrollTrigger.refresh(), 600)
    return () => clearTimeout(t)
  }, [open])
  return (
    <div className="mt-40">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <SectionLabel index="02.b">Archive</SectionLabel>
          <h3 className="mt-5 font-display text-3xl font-semibold tracking-tight md:text-4xl">More things I've built</h3>
        </div>
        <a href={profile.links.github} target="_blank" rel="noopener" className="font-mono text-xs text-mute underline-offset-4 hover:text-fg hover:underline">
          github.com/TheParthi ↗
        </a>
      </div>
      <ul className="mt-10 border-t border-line">
        {archiveProjects.map((p, i) => {
          const isOpen = open === i
          return (
            <li key={p.title} className="border-b border-line">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="group grid w-full grid-cols-[36px_1fr_auto] items-center gap-4 py-5 text-left md:grid-cols-[60px_1.3fr_1fr_auto]"
              >
                <span className="font-mono text-xs text-dim">{String(i + 1).padStart(2, '0')}</span>
                <span className="font-display text-lg font-medium transition-transform duration-500 ease-out-expo group-hover:translate-x-2 md:text-2xl">
                  {p.title}
                </span>
                <span className="hidden font-mono text-[11px] text-mute md:block">{p.kind}</span>
                <Plus className={`h-4 w-4 text-mute transition-transform duration-500 ${isOpen ? 'rotate-45 text-cyan' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.5, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <div className="grid gap-4 pb-6 pl-[52px] md:grid-cols-[1.3fr_1fr_auto] md:pl-[76px]">
                      <p className="text-sm leading-relaxed text-mute">
                        {p.description}
                        {p.note && <span className="mt-2 block font-mono text-[11px] text-dim">{p.note}</span>}
                      </p>
                      <ul className="flex flex-wrap content-start gap-1.5">
                        {p.tech.map((t) => (
                          <li key={t} className="rounded-full border border-line px-2.5 py-1 font-mono text-[10px] text-fg/70">
                            {t}
                          </li>
                        ))}
                      </ul>
                      <div className="flex gap-4">
                        {p.links.map((l) => (
                          <a key={l.href} href={l.href} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm text-fg hover:text-cyan">
                            {l.label} <ArrowUpRight className="h-3.5 w-3.5" />
                          </a>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function Projects() {
  const [openId, setOpenId] = useState<string | null>(null)
  const project = featuredProjects.find((p) => p.id === openId)

  const close = useCallback(() => setOpenId(null), [])

  return (
    <section id="projects" className="relative px-5 py-32 sm:px-8 md:py-44">
      <div aria-hidden className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-line-2 to-transparent" />
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <SectionLabel index="02">Selected work</SectionLabel>
            <SplitHeading
              text="Things I've engineered."
              className="mt-8 font-display text-[clamp(3rem,8vw,7rem)] font-semibold leading-[0.92] tracking-[-0.04em]"
            />
          </div>
          <Reveal className="self-end lg:col-span-4 lg:col-start-9">
            <p className="text-[15px] leading-relaxed text-mute">
              Four projects, from a ride-hailing platform in production to research on the edge. Hover a preview for the stack; open one for the architecture and the hard parts.
            </p>
          </Reveal>
        </div>

        <div className="mt-28 space-y-40 md:space-y-52">
          {featuredProjects.map((p, i) => (
            <ProjectRow key={p.id} project={p} flip={i % 2 === 1} onOpen={() => setOpenId(p.id)} />
          ))}
        </div>

        <Archive />
      </div>

      {createPortal(
        <AnimatePresence>{project && <ProjectModal key={project.id} project={project} onClose={close} />}</AnimatePresence>,
        document.body,
      )}
    </section>
  )
}
