import { motion } from 'framer-motion'
import { GraduationCap } from 'lucide-react'
import { useContent } from '../../content/context'
import { headingSize, PAD_DEFAULT, SectionBackdrop, sectionAttrs, useSection } from '../../content/sections'
import { EASE } from '../../lib/motion'
import { Reveal, SectionLabel, SplitHeading } from '../ui/Reveal'

/**
 * Education as a ledger: each entry is a wide row with the graduation year set
 * large in outline type, the programme in the middle and the grade/notes on
 * the right — deliberately unlike the timeline cards.
 */
export function Education() {
  const { bundle } = useContent()
  const view = useSection('education')
  const items = bundle.education.filter((e) => e.visible !== false)
  if (!items.length) return null

  return (
    <section id="education" className="sec-y relative px-5 sm:px-8" {...sectionAttrs(view, PAD_DEFAULT)}>
      <SectionBackdrop view={view} />
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <SectionLabel index={view.index}>{view.eyebrow || 'Education'}</SectionLabel>
            <SplitHeading
              text={view.heading || 'Education.'}
              className={`mt-8 font-display ${headingSize.md} font-semibold leading-[0.92] tracking-[-0.04em]`}
            />
          </div>
          {view.description && (
            <Reveal className="self-end lg:col-span-4 lg:col-start-9">
              <p className="text-[15px] leading-relaxed text-mute">{view.description}</p>
            </Reveal>
          )}
        </div>

        <ol className="mt-16 border-t border-line">
          {items.map((e, i) => {
            const years = [e.startYear, e.graduationYear].filter(Boolean).join(' — ')
            return (
              <motion.li
                key={e.id}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-10% 0px' }}
                transition={{ duration: 0.9, ease: EASE, delay: i * 0.08 }}
                className="group relative grid gap-6 border-b border-line py-10 md:grid-cols-[minmax(0,220px)_1fr_minmax(0,280px)] md:gap-10 md:py-14"
              >
                <div
                  aria-hidden
                  className="select-none font-display text-6xl font-bold leading-none tracking-tighter text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,.22)] md:text-7xl"
                >
                  {e.graduationYear ?? e.startYear ?? '—'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] text-cyan uppercase">
                    <GraduationCap className="h-4 w-4" />
                    {e.graduationYear && e.graduationYear > new Date().getFullYear() ? 'In progress' : 'Completed'}
                    {years && <span className="text-dim normal-case tracking-normal">· {years}</span>}
                  </div>
                  <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight md:text-3xl">
                    {[e.degree, e.field].filter(Boolean).join(' ')}
                  </h3>
                  <p className="mt-2 text-[15px] text-mute">{e.institution}</p>
                  {e.description && <p className="mt-4 max-w-xl text-sm leading-relaxed text-mute">{e.description}</p>}
                </div>
                <div className="flex flex-col gap-4 md:items-end md:text-right">
                  {e.grade && (
                    <span className="inline-flex w-fit items-center rounded-full border border-line-2 bg-ink-2 px-3 py-1.5 font-mono text-[11px] text-fg/85">
                      {e.grade}
                    </span>
                  )}
                  {e.achievements.length > 0 && (
                    <ul className="space-y-2">
                      {e.achievements.map((a) => (
                        <li key={a} className="text-sm leading-relaxed text-fg/80">
                          {a}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </motion.li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
