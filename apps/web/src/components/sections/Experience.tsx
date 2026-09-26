import { useEffect, useRef } from 'react'
import { milestones, type MilestoneKind } from '../../data/experience'
import { gsap } from '../../lib/scroll'
import { Reveal, SectionLabel, SplitHeading } from '../ui/Reveal'

const KIND_STYLE: Record<MilestoneKind, string> = {
  Internship: 'border-cyan/40 text-cyan',
  Winner: 'border-amber-300/40 text-amber-200',
  Selected: 'border-violet/50 text-violet-200',
  Participated: 'border-line-2 text-mute',
  Certified: 'border-emerald-400/40 text-emerald-300',
  Research: 'border-pink-400/40 text-pink-300',
}

export function Experience() {
  const track = useRef<HTMLDivElement>(null)
  const line = useRef<HTMLDivElement>(null)
  const items = milestones.filter((m) => !m.hidden)

  // The timeline path draws itself as you scroll through the section.
  useEffect(() => {
    if (!track.current || !line.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        line.current,
        { scaleY: 0 },
        { scaleY: 1, ease: 'none', scrollTrigger: { trigger: track.current, start: 'top 70%', end: 'bottom 70%', scrub: 0.4 } },
      )
      gsap.utils.toArray<HTMLElement>('[data-milestone]').forEach((el) => {
        gsap.fromTo(
          el.querySelector('[data-dot]'),
          { scale: 0.4, backgroundColor: '#161923' },
          { scale: 1, backgroundColor: '#00E5FF', scrollTrigger: { trigger: el, start: 'top 70%', toggleActions: 'play none none reverse' } },
        )
      })
    })
    return () => ctx.revert()
  }, [])

  return (
    <section id="experience" className="relative px-5 py-32 sm:px-8 md:py-44">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5 lg:sticky lg:top-32 lg:self-start">
            <SectionLabel index="05">Experience</SectionLabel>
            <SplitHeading
              text="Milestones, so far."
              className="mt-8 font-display text-[clamp(2.8rem,6.5vw,5.5rem)] font-semibold leading-[0.92] tracking-[-0.04em]"
            />
            <Reveal delay={0.1}>
              <p className="mt-8 max-w-sm text-[15px] leading-relaxed text-mute">
                Internships, hackathons, research and certifications. Each is labelled for what it was — a win, a selection, or taking part.
              </p>
              <ul className="mt-8 flex max-w-sm flex-wrap gap-2">
                {(Object.keys(KIND_STYLE) as MilestoneKind[]).map((k) => (
                  <li key={k} className={`rounded-full border px-2.5 py-1 font-mono text-[10px] ${KIND_STYLE[k]}`}>
                    {k}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          <div ref={track} className="relative lg:col-span-7">
            <div className="absolute bottom-2 left-[7px] top-2 w-px bg-line" aria-hidden />
            <div ref={line} className="absolute bottom-2 left-[7px] top-2 w-px origin-top bg-gradient-to-b from-cyan via-violet to-violet/0" aria-hidden />
            <ol className="space-y-4">
              {items.map((m, i) => (
                <li key={m.title} data-milestone className="relative pl-10">
                  <span data-dot className="absolute left-0 top-7 h-[15px] w-[15px] rounded-full border-2 border-ink bg-ink-3 ring-1 ring-line-2" aria-hidden />
                  <Reveal delay={Math.min(i * 0.03, 0.15)}>
                    <div className="group rounded-2xl border border-transparent p-5 transition-colors duration-500 hover:border-line hover:bg-ink-2/60">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-wide ${KIND_STYLE[m.kind]}`}>{m.kind}</span>
                        {m.date && <span className="font-mono text-[11px] text-dim">{m.date}</span>}
                      </div>
                      <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight">
                        {m.title}
                        <span className="text-mute"> · {m.org}</span>
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-mute">{m.detail}</p>
                      {m.points && (
                        <ul className="mt-4 space-y-2">
                          {m.points.map((p) => (
                            <li key={p} className="relative pl-4 text-sm leading-relaxed text-fg/80 before:absolute before:left-0 before:top-[0.6em] before:h-px before:w-2 before:bg-cyan">
                              {p}
                            </li>
                          ))}
                        </ul>
                      )}
                      {m.meta && (
                        <div className="mt-4 font-mono text-[11px] text-dim">{m.meta.join('  /  ')}</div>
                      )}
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  )
}
