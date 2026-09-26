import { motion } from 'framer-motion'
import { ArrowUpRight, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { FeatureStatus, FeaturedProject } from '../../data/projects'
import { EASE } from '../../lib/motion'
import { lockScroll } from '../../lib/scroll'

const statusStyle: Record<FeatureStatus, { label: string; cls: string }> = {
  shipped: { label: 'Implemented', cls: 'border-emerald-400/40 text-emerald-300' },
  'in-progress': { label: 'In progress', cls: 'border-amber-300/40 text-amber-200' },
  proposed: { label: 'Proposed', cls: 'border-line-2 text-mute' },
}

export function ProjectModal({ project, onClose }: { project: FeaturedProject; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    lockScroll(true)
    const prev = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      // Keep keyboard focus inside the dialog.
      if (e.key === 'Tab' && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>('a[href], button')
        if (!f.length) return
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('keydown', key)
      lockScroll(false)
      prev?.focus()
    }
  }, [onClose])

  return (
    <motion.div
      className="fixed inset-0 z-[55] flex items-end justify-center sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="absolute inset-0 bg-ink/80 backdrop-blur-md" onClick={onClose} aria-hidden />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pm-title"
        data-lenis-prevent
        className="relative max-h-[92svh] w-full max-w-4xl overflow-y-auto overscroll-contain rounded-t-[28px] border border-line bg-ink-2 sm:rounded-[28px]"
        initial={{ y: 60, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-ink-2/90 px-6 py-4 backdrop-blur sm:px-10">
          <span className="font-mono text-xs text-mute">
            <span style={{ color: project.accent }}>{project.index}</span> / {project.category}
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close project details"
            className="grid h-9 w-9 place-items-center rounded-full border border-line-2 transition-colors hover:bg-fg hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 pb-12 pt-8 sm:px-10">
          <h3 id="pm-title" className="font-display text-5xl font-semibold tracking-[-0.04em] sm:text-6xl">
            {project.title}
          </h3>
          {project.fullTitle && <p className="mt-3 max-w-2xl text-sm text-mute">{project.fullTitle}</p>}
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-fg/85">{project.description}</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 font-mono text-[11px] text-mute">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: project.accent }} />
            {project.status}
          </div>

          {/* Architecture as a stacked layer diagram */}
          <h4 className="eyebrow mt-12">Architecture</h4>
          <ol className="relative mt-5 space-y-3 before:absolute before:bottom-6 before:left-[15px] before:top-6 before:w-px before:bg-line-2">
            {project.architecture.map((a, i) => (
              <li key={a.layer} className="relative grid grid-cols-[32px_1fr] gap-4">
                <span
                  className="relative z-10 grid h-8 w-8 place-items-center rounded-full border bg-ink font-mono text-[10px]"
                  style={{ borderColor: project.accent, color: project.accent }}
                >
                  {i + 1}
                </span>
                <div className="rounded-2xl border border-line bg-ink/50 p-4">
                  <div className="font-display text-base font-medium">{a.layer}</div>
                  <p className="mt-1 text-sm leading-relaxed text-mute">{a.detail}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-12 grid gap-10 md:grid-cols-2">
            <div>
              <h4 className="eyebrow">Features</h4>
              <ul className="mt-5 space-y-3">
                {project.features.map((f) => (
                  <li key={f.text} className="flex items-start justify-between gap-4 border-b border-line pb-3 text-sm">
                    <span className="text-fg/85">{f.text}</span>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] ${statusStyle[f.status].cls}`}>
                      {statusStyle[f.status].label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="eyebrow">Technical challenges</h4>
              <ul className="mt-5 space-y-5">
                {project.challenges.map((c) => (
                  <li key={c.title}>
                    <div className="font-display font-medium">{c.title}</div>
                    <p className="mt-1 text-sm leading-relaxed text-mute">{c.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <h4 className="eyebrow mt-12">Technology</h4>
          <ul className="mt-4 flex flex-wrap gap-2">
            {project.tech.map((t) => (
              <li key={t} className="rounded-full border border-line px-3 py-1.5 font-mono text-[11px] text-fg/80">
                {t}
              </li>
            ))}
          </ul>

          {project.note && <p className="mt-10 border-l-2 pl-4 text-sm text-mute" style={{ borderColor: project.accent }}>{project.note}</p>}

          {project.links.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-3">
              {project.links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noopener"
                  className="group inline-flex items-center gap-2 rounded-full border border-line-2 px-4 py-2 text-sm transition-colors hover:bg-fg hover:text-ink"
                >
                  {l.label}
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
