import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, ChevronLeft, ChevronRight, Expand, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { type Showcase, type ShowcaseApp, type ShowcaseShot, workUrl } from '../../data/showcase'
import { track } from '../../lib/analytics'
import { EASE } from '../../lib/motion'
import { lockScroll } from '../../lib/scroll'
import { Reveal } from '../ui/Reveal'

// "Proof of work" panel shown under a featured project: real store
// screenshots of each live app, grouped by app, with install counts and
// store links. Clicking a screenshot opens a full-screen viewer.

function StoreButton({ href, label, sub, project }: { href: string; label: string; sub: string; project: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      data-ev="PROJECT_CLICK"
      data-ev-target={label}
      data-ev-project={project}
      className="btn-shape group inline-flex items-center gap-3 rounded-xl border border-line-2 bg-ink/60 px-4 py-2 transition-colors hover:border-fg hover:bg-fg hover:text-ink"
    >
      <span className="flex flex-col leading-tight">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-mute group-hover:text-ink/60">{sub}</span>
        <span className="text-sm font-medium">{label}</span>
      </span>
      <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </a>
  )
}

/** What the rail and viewer show: one app's real screens or its store graphics. */
interface Gallery {
  key: string
  dir: string
  shots: ShowcaseShot[]
  /** Real screens are drawn inside a phone frame; store graphics already have one. */
  framed: boolean
  /** Website screens: landscape, drawn in a browser frame. */
  web: boolean
}

const iconUrl = (app: ShowcaseApp) => workUrl(app.dir, app.icon ?? 'icon.webp')

function galleryFor(app: ShowcaseApp, mode: 'ui' | 'store'): Gallery {
  const web = app.kind === 'web'
  return (mode === 'ui' && app.ui?.length) || !app.shots.length
    ? { key: `${app.id}-ui`, dir: web ? `${app.dir}/web` : `${app.dir}/ui`, shots: app.ui ?? [], framed: !web, web }
    : { key: `${app.id}-store`, dir: app.dir, shots: app.shots, framed: false, web: false }
}

function Lightbox({ app, gallery, index, onClose, onMove }: { app: ShowcaseApp; gallery: Gallery; index: number; onClose: () => void; onMove: (d: number) => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const shot = gallery.shots[index]

  useEffect(() => {
    lockScroll(true)
    const prev = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onMove(1)
      if (e.key === 'ArrowLeft') onMove(-1)
    }
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('keydown', key)
      lockScroll(false)
      prev?.focus()
    }
  }, [onClose, onMove])

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[70] flex flex-col bg-ink/95 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-label={`${app.name} screenshots`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <img src={iconUrl(app)} alt="" width={32} height={32} className="h-8 w-8 rounded-lg" />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{app.name}</div>
            <div className="font-mono text-[10px] text-dim">
              {index + 1} / {gallery.shots.length} · {gallery.web ? 'Website' : gallery.framed ? 'Real app screen' : 'Store listing'}
            </div>
          </div>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close screenshot viewer"
          className="grid h-10 w-10 place-items-center rounded-full border border-line-2 transition-colors hover:bg-fg hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-14 sm:px-24" onClick={onClose}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.img
            key={gallery.key + shot.file}
            src={workUrl(gallery.dir, shot.file)}
            alt={shot.caption}
            onClick={(e) => e.stopPropagation()}
            className={`max-h-full max-w-full object-contain shadow-2xl shadow-black/60 ${gallery.framed ? 'rounded-[28px] border-[6px] border-[#1c1f27]' : gallery.web ? 'rounded-xl border border-line-2' : 'rounded-2xl border border-line'}`}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.3, ease: EASE }}
          />
        </AnimatePresence>
        {gallery.shots.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous screenshot"
              onClick={(e) => {
                e.stopPropagation()
                onMove(-1)
              }}
              className="absolute left-3 grid h-11 w-11 place-items-center rounded-full border border-line-2 bg-ink/70 transition-colors hover:bg-fg hover:text-ink sm:left-6"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next screenshot"
              onClick={(e) => {
                e.stopPropagation()
                onMove(1)
              }}
              className="absolute right-3 grid h-11 w-11 place-items-center rounded-full border border-line-2 bg-ink/70 transition-colors hover:bg-fg hover:text-ink sm:right-6"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
      <p className="px-6 pb-6 pt-4 text-center text-sm text-mute">{shot.caption}</p>
    </motion.div>,
    document.body,
  )
}

function Rail({ gallery, accent, onOpen }: { gallery: Gallery; accent: string; onOpen: (i: number) => void }) {
  const rail = useRef<HTMLUListElement>(null)
  const [edge, setEdge] = useState({ start: true, end: false })

  const measure = useCallback(() => {
    const el = rail.current
    if (!el) return
    setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 })
  }, [])

  useEffect(() => {
    const el = rail.current
    if (!el) return
    el.scrollLeft = 0
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [gallery, measure])

  const page = (d: number) => {
    const el = rail.current
    if (el) el.scrollBy({ left: d * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  return (
    <div className="relative">
      <ul
        ref={rail}
        onScroll={measure}
        data-lenis-prevent
        className="no-scrollbar -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:scroll-px-8 sm:gap-5 sm:px-8"
      >
        {gallery.shots.map((s, i) => (
          <motion.li
            key={s.file}
            className="shrink-0 snap-start"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: Math.min(i, 6) * 0.05 }}
          >
            <button
              type="button"
              onClick={() => onOpen(i)}
              className={
                gallery.framed
                  ? // Phone frame: dark bezel, rounded corners, soft shadow.
                    'group relative block overflow-hidden rounded-[30px] border-[5px] border-[#1c1f27] bg-ink shadow-xl shadow-black/50 ring-1 ring-line-2 transition-transform duration-500 hover:-translate-y-1'
                  : gallery.web
                    ? // Browser frame: a slim title bar with traffic-light dots.
                      'group relative block overflow-hidden rounded-xl border border-line-2 bg-[#1c1f27] shadow-xl shadow-black/50 transition-transform duration-500 hover:-translate-y-1'
                    : 'group relative block overflow-hidden rounded-2xl border border-line bg-ink transition-colors hover:border-line-2'
              }
              aria-label={`Open screenshot: ${s.caption}`}
              data-cursor="view"
            >
              {gallery.web && (
                <span aria-hidden className="flex h-6 items-center gap-1.5 px-3">
                  <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
                  <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
                  <span className="h-2 w-2 rounded-full bg-[#28c840]" />
                </span>
              )}
              <img
                src={workUrl(gallery.dir, s.file)}
                alt={s.caption}
                loading="lazy"
                decoding="async"
                className={
                  gallery.web
                    ? 'h-[210px] w-auto sm:h-[340px]'
                    : `h-[360px] w-auto sm:h-[440px] ${gallery.framed ? 'rounded-[25px]' : 'transition-transform duration-700 ease-out-expo group-hover:scale-[1.03]'}`
                }
              />
              <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-ink/70 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                <Expand className="h-3.5 w-3.5" />
              </span>
            </button>
            <p className="mt-3 flex max-w-[240px] items-start gap-2 text-xs leading-snug text-mute">
              <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full" style={{ background: accent }} />
              {s.caption}
            </p>
          </motion.li>
        ))}
      </ul>
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-24 bg-gradient-to-l from-ink-2 to-transparent sm:block" style={{ opacity: edge.end ? 0 : 1 }} />
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          aria-label="Scroll screenshots left"
          disabled={edge.start}
          onClick={() => page(-1)}
          className="grid h-10 w-10 place-items-center rounded-full border border-line-2 transition-colors hover:bg-fg hover:text-ink disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Scroll screenshots right"
          disabled={edge.end}
          onClick={() => page(1)}
          className="grid h-10 w-10 place-items-center rounded-full border border-line-2 transition-colors hover:bg-fg hover:text-ink disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function AppShowcase({ showcase }: { showcase: Showcase }) {
  const [active, setActive] = useState(0)
  const [mode, setMode] = useState<'ui' | 'store'>('ui')
  const [viewer, setViewer] = useState<number | null>(null)
  const app = showcase.apps[active]
  const gallery = galleryFor(app, mode)
  const hasUi = !!app.ui?.length && app.shots.length > 0
  const { accent } = showcase

  const close = useCallback(() => setViewer(null), [])
  const count = gallery.shots.length
  const move = useCallback((d: number) => setViewer((v) => (v === null ? v : (v + d + count) % count)), [count])

  return (
    <Reveal>
      <section
        aria-label={`${app.name} app screenshots`}
        className="relative overflow-hidden rounded-[28px] border border-line bg-ink-2 px-5 py-8 sm:px-8 sm:py-10 lg:px-12"
      >
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-20 blur-[100px]" style={{ background: accent }} />

        {/* Header */}
        <div className="relative grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-mute">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              {showcase.eyebrow}
            </p>
            <h4 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em] md:text-4xl">{showcase.headline}</h4>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-mute">{showcase.summary}</p>
          </div>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:col-span-5">
            {showcase.stats.map((s) => (
              <div key={s.label} className="bg-ink-2 px-4 py-4">
                <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-dim">{s.label}</dt>
                <dd className="mt-1 font-display text-xl font-semibold tracking-tight md:text-2xl">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {showcase.wide && (
          <figure className="relative mt-10 overflow-hidden rounded-2xl border border-line">
            <img
              src={`${import.meta.env.BASE_URL}work/${showcase.wide.file}`}
              alt={showcase.wide.caption}
              loading="lazy"
              decoding="async"
              width={1600}
              height={900}
              className="h-auto w-full"
            />
          </figure>
        )}

        {/* App switcher */}
        <div role="tablist" aria-label="Apps" className="relative mt-10 flex flex-wrap gap-2">
          {showcase.apps.map((a, i) => {
            const on = i === active
            return (
              <button
                key={a.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => {
                  setActive(i)
                  setMode('ui')
                  track('PROJECT_VIEW', { projectSlug: a.id, section: 'showcase' })
                }}
                className="flex items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-colors"
                style={{
                  borderColor: on ? accent : 'var(--color-line)',
                  background: on ? `color-mix(in srgb, ${accent} 12%, transparent)` : 'transparent',
                }}
              >
                <img src={iconUrl(a)} alt="" width={36} height={36} className="h-9 w-9 rounded-xl" />
                <span className="flex flex-col leading-tight">
                  <span className={`text-sm font-medium ${on ? 'text-fg' : 'text-fg/75'}`}>{a.name}</span>
                  <span className="font-mono text-[10px] text-dim">{a.audience}</span>
                </span>
              </button>
            )
          })}
        </div>

        {/* Selected app */}
        <div className="relative mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <div className="flex flex-wrap items-center gap-4">
            {hasUi && (
              <div role="radiogroup" aria-label="Screenshot type" className="inline-flex rounded-full border border-line-2 p-1">
                {(
                  [
                    ['ui', 'Real app screens', app.ui!.length],
                    ['store', 'Store listing', app.shots.length],
                  ] as const
                ).map(([m, label, n]) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={mode === m}
                    onClick={() => setMode(m)}
                    className={`rounded-full px-3.5 py-1.5 text-xs transition-colors ${mode === m ? 'bg-fg text-ink' : 'text-mute hover:text-fg'}`}
                  >
                    {label} <span className="font-mono text-[10px] opacity-60">{n}</span>
                  </button>
                ))}
              </div>
            )}
            <p className="font-mono text-[11px] text-mute">
              {app.installs ? (
                <>
                  <span className="text-fg">{app.installs}</span> installs on Google Play
                </>
              ) : (
                app.meta
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {app.playUrl && <StoreButton href={app.playUrl} label="Google Play" sub="Get it on" project={showcase.projectId} />}
            {app.appStoreUrl && <StoreButton href={app.appStoreUrl} label="App Store" sub="Download on the" project={showcase.projectId} />}
            {app.links?.map((l) => <StoreButton key={l.href} href={l.href} label={l.label} sub={l.sub} project={showcase.projectId} />)}
          </div>
        </div>

        <div className="relative mt-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={gallery.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <Rail gallery={gallery} accent={accent} onOpen={setViewer} />
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <AnimatePresence>{viewer !== null && <Lightbox key="viewer" app={app} gallery={gallery} index={viewer} onClose={close} onMove={move} />}</AnimatePresence>
    </Reveal>
  )
}
