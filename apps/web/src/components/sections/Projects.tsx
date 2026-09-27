import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Plus } from 'lucide-react'
import type { PublicProject } from '@pg/shared'
import { createPortal } from 'react-dom'
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ComponentType } from 'react'
import { useContent } from '../../content/context'
import { displayUrl, safeHref } from '../../content/format'
import { primaryLink, projectLinks, selectProjects } from '../../content/projects'
import { headingSize, PAD_DEFAULT, SectionBackdrop, sectionAttrs, useSection } from '../../content/sections'
import { track } from '../../lib/analytics'
import { EASE, isReducedMotion, useReducedMotion } from '../../lib/motion'
import { gsap, ScrollTrigger } from '../../lib/scroll'
import { DeliveryPreview } from '../previews/DeliveryPreview'
import { ImagePreview } from '../previews/ImagePreview'
import { MobilityPreview } from '../previews/MobilityPreview'
import { SecurityPreview } from '../previews/SecurityPreview'
import { VisionPreview } from '../previews/VisionPreview'
import { Reveal, SectionLabel, SplitHeading } from '../ui/Reveal'

// The modal (with marked + DOMPurify) loads on demand; hovering a project
// starts the download early.
const loadModal = () => import('./ProjectModal')
const ProjectModal = lazy(loadModal)

const previews: Record<string, ComponentType> = {
  mobility: MobilityPreview,
  delivery: DeliveryPreview,
  security: SecurityPreview,
  vision: VisionPreview,
}

function Preview({ project }: { project: PublicProject }) {
  const Animated = project.previewStyle !== 'image' ? previews[project.previewStyle] : undefined
  return Animated ? <Animated /> : <ImagePreview project={project} />
}

/** Archive rows open the modal only when the CMS gave them something to show. */
const hasDetail = (p: PublicProject) =>
  !!(p.cover || p.screenshots.length || p.architecture.length || p.features.length || p.challenges.length || p.contribution?.trim() || p.team.length)

function ProjectRow({ project, index, flip, onOpen }: { project: PublicProject; index: string; flip: boolean; onOpen: () => void }) {
  const frame = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const link = primaryLink(project)

  // Cinematic entrance: the preview unmasks from an inset clip as it scrolls in.
  useEffect(() => {
    const el = frame.current
    if (!el || reduced || isReducedMotion()) return
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
  }, [reduced])

  return (
    <article
      className="group/row relative grid items-center gap-8 lg:grid-cols-12 lg:gap-12"
      aria-labelledby={`p-${project.slug}`}
      onPointerEnter={() => void loadModal()}
    >
      {/* Preview */}
      <div className={`lg:col-span-8 ${flip ? 'lg:order-2' : ''}`}>
        <button
          type="button"
          onClick={onOpen}
          className="group relative block w-full text-left"
          aria-label={`Explore ${project.title}`}
          data-cursor="view"
        >
          <div ref={frame} className="relative -mx-2 aspect-[800/520] overflow-hidden rounded-2xl border border-line bg-ink-2 sm:mx-0 sm:rounded-[28px]">
            <div className="h-full w-full transition-transform duration-[1.2s] ease-out-expo group-hover:scale-[1.035]">
              <Preview project={project} />
            </div>
            {/* Hover reveal: extra technical detail slides up */}
            <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-ink via-ink/90 to-transparent p-5 pt-16 transition-transform duration-700 ease-out-expo group-hover:translate-y-0 group-focus-visible:translate-y-0">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <ul className="flex max-w-[70%] flex-wrap gap-1.5">
                  {project.technologies.slice(0, 6).map((t) => (
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
            {index}
          </div>
          <p className="relative font-mono text-[11px] tracking-[0.14em] uppercase" style={{ color: project.accent }}>
            {project.category}
          </p>
          <h3 id={`p-${project.slug}`} className="relative mt-4 overflow-hidden font-display text-5xl font-semibold tracking-[-0.04em] md:text-6xl">
            <span className="block transition-transform duration-700 ease-out-expo group-hover/row:-translate-y-full">{project.title}</span>
            <span
              className={`absolute top-full block transition-transform duration-700 ease-out-expo group-hover/row:-translate-y-full ${flip ? 'right-0' : 'left-0'}`}
              style={{ color: project.accent }}
              aria-hidden
            >
              {project.title}
            </span>
          </h3>
          <p className="relative mt-5 text-[15px] leading-relaxed text-mute">{project.shortDescription}</p>
          {project.statusLabel && (
            <div className={`mt-5 flex items-center gap-2 font-mono text-[11px] text-dim ${flip ? 'lg:justify-end' : ''}`}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: project.accent }} />
              {project.statusLabel}
            </div>
          )}
          <div className={`mt-8 flex flex-wrap gap-3 ${flip ? 'lg:justify-end' : ''}`}>
            <button
              type="button"
              onClick={onOpen}
              className="btn-shape group/btn inline-flex items-center gap-2 rounded-full border border-line-2 px-5 py-2.5 text-sm transition-colors hover:border-fg hover:bg-fg hover:text-ink"
            >
              Explore Project
              <Plus className="h-4 w-4 transition-transform duration-500 group-hover/btn:rotate-90" />
            </button>
            {link && (
              <a
                href={link.href}
                target="_blank"
                rel="noopener"
                data-ev="PROJECT_CLICK"
                data-ev-target={link.target}
                data-ev-project={project.slug}
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

function Archive({ projects, index, onOpen }: { projects: PublicProject[]; index: string; onOpen: (slug: string) => void }) {
  const { bundle } = useContent()
  const github = safeHref(bundle.profile.links.github)
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
          <SectionLabel index={`${index}.b`}>Archive</SectionLabel>
          <h3 className="mt-5 font-display text-3xl font-semibold tracking-tight md:text-4xl">More things I've built</h3>
        </div>
        {github && (
          <a
            href={github}
            target="_blank"
            rel="noopener"
            data-ev="GITHUB_CLICK"
            data-ev-target="archive"
            className="font-mono text-xs text-mute underline-offset-4 hover:text-fg hover:underline"
          >
            {displayUrl(github)} ↗
          </a>
        )}
      </div>
      <ul className="mt-10 border-t border-line">
        {projects.map((p, i) => {
          const isOpen = open === i
          const links = projectLinks(p)
          return (
            <li key={p.id} className="border-b border-line">
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
                <span className="hidden font-mono text-[11px] text-mute md:block">{p.category}</span>
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
                        {p.shortDescription}
                        {p.note && <span className="mt-2 block font-mono text-[11px] text-dim">{p.note}</span>}
                      </p>
                      <ul className="flex flex-wrap content-start gap-1.5">
                        {p.technologies.map((t) => (
                          <li key={t} className="rounded-full border border-line px-2.5 py-1 font-mono text-[10px] text-fg/70">
                            {t}
                          </li>
                        ))}
                      </ul>
                      <div className="flex flex-wrap gap-4">
                        {hasDetail(p) && (
                          <button
                            type="button"
                            onClick={() => onOpen(p.slug)}
                            onPointerEnter={() => void loadModal()}
                            className="inline-flex items-center gap-1 text-sm text-fg hover:text-cyan"
                          >
                            Details <Plus className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {links.map((l) => (
                          <a
                            key={l.href}
                            href={l.href}
                            target="_blank"
                            rel="noopener"
                            data-ev="PROJECT_CLICK"
                            data-ev-target={l.target}
                            data-ev-project={p.slug}
                            className="inline-flex items-center gap-1 text-sm text-fg hover:text-cyan"
                          >
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
  const { bundle } = useContent()
  const view = useSection('projects')
  const { featured, archive } = selectProjects(bundle)
  const [openSlug, setOpenSlug] = useState<string | null>(null)
  const project = bundle.projects.find((p) => p.slug === openSlug)
  const projectIndex = project ? featured.indexOf(project) : -1

  const open = useCallback((slug: string) => {
    setOpenSlug(slug)
    track('PROJECT_VIEW', { projectSlug: slug, section: 'projects' })
  }, [])
  const close = useCallback(() => setOpenSlug(null), [])

  return (
    <section id="projects" className="sec-y relative px-5 sm:px-8" {...sectionAttrs(view, PAD_DEFAULT)}>
      <div aria-hidden className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-line-2 to-transparent" />
      <SectionBackdrop view={view} />
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <SectionLabel index={view.index}>{view.eyebrow || 'Selected work'}</SectionLabel>
            <SplitHeading
              text={view.heading || "Things I've engineered."}
              className={`mt-8 font-display ${headingSize.xl} font-semibold leading-[0.92] tracking-[-0.04em]`}
            />
          </div>
          <Reveal className="self-end lg:col-span-4 lg:col-start-9">
            <p className="text-[15px] leading-relaxed text-mute">
              {view.description ||
                'Four projects, from a ride-hailing platform in production to research on the edge. Hover or tap a preview for the stack; open one for the architecture and the hard parts.'}
            </p>
          </Reveal>
        </div>

        {featured.length > 0 && (
          <div className="mt-28 space-y-40 md:space-y-52">
            {featured.map((p, i) => (
              <ProjectRow key={p.id} project={p} index={String(i + 1).padStart(2, '0')} flip={i % 2 === 1} onOpen={() => open(p.slug)} />
            ))}
          </div>
        )}

        {archive.length > 0 && <Archive projects={archive} index={view.index} onOpen={open} />}
      </div>

      {createPortal(
        <AnimatePresence>
          {project && (
            <Suspense key={project.id} fallback={null}>
              <ProjectModal
                project={project}
                index={projectIndex >= 0 ? String(projectIndex + 1).padStart(2, '0') : ''}
                onClose={close}
              />
            </Suspense>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </section>
  )
}
