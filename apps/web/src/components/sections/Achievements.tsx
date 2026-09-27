import { motion } from 'framer-motion'
import { ArrowUpRight, Award, BadgeCheck, FlaskConical, Flag, Sparkles, Star, Trophy, type LucideIcon } from 'lucide-react'
import { useContent } from '../../content/context'
import { fmtYm, safeHref, yearOf } from '../../content/format'
import { headingSize, PAD_DEFAULT, SectionBackdrop, sectionAttrs, useSection } from '../../content/sections'
import { EASE } from '../../lib/motion'
import { Reveal, SectionLabel, SplitHeading } from '../ui/Reveal'

const KIND: Record<string, { icon: LucideIcon; color: string; plural: string }> = {
  Winner: { icon: Trophy, color: '#FFD166', plural: 'Wins' },
  Award: { icon: Award, color: '#FFD166', plural: 'Awards' },
  Selected: { icon: Star, color: '#B388FF', plural: 'Selections' },
  Research: { icon: FlaskConical, color: '#F472B6', plural: 'Research' },
  Participated: { icon: Flag, color: '#969BA8', plural: 'Participations' },
  Other: { icon: Sparkles, color: '#00E5FF', plural: 'Other' },
}

/**
 * Achievements as a trophy wall: a tally strip by kind, then a grid of
 * tiles whose icon and colour carry the kind. Certifications follow as a
 * compact credential list.
 */
export function Achievements() {
  const { bundle } = useContent()
  const view = useSection('achievements')
  const items = bundle.achievements.filter((a) => a.visible !== false)
  const certs = bundle.certifications.filter((c) => c.visible !== false)
  if (!items.length && !certs.length) return null

  const tally = Object.keys(KIND)
    .map((k) => ({ k, n: items.filter((a) => a.kind === k).length }))
    .filter((t) => t.n > 0)

  return (
    <section id="achievements" className="sec-y relative px-5 sm:px-8" {...sectionAttrs(view, PAD_DEFAULT)}>
      <SectionBackdrop view={view} />
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <SectionLabel index={view.index}>{view.eyebrow || 'Achievements'}</SectionLabel>
            <SplitHeading
              text={view.heading || 'Achievements.'}
              className={`mt-8 font-display ${headingSize.md} font-semibold leading-[0.92] tracking-[-0.04em]`}
            />
          </div>
          <Reveal className="self-end lg:col-span-4 lg:col-start-9">
            {view.description && <p className="text-[15px] leading-relaxed text-mute">{view.description}</p>}
            {tally.length > 0 && (
              <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-4">
                {tally.map((t) => (
                  <div key={t.k}>
                    <dt className="eyebrow !text-[10px]">{KIND[t.k].plural}</dt>
                    <dd className="mt-1 font-display text-4xl font-semibold tabular-nums" style={{ color: KIND[t.k].color }}>
                      {String(t.n).padStart(2, '0')}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </Reveal>
        </div>

        {items.length > 0 && (
          <ul className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((a, i) => {
              const k = KIND[a.kind] ?? KIND.Other
              const Icon = k.icon
              const img = safeHref(a.media?.url)
              const verify = safeHref(a.verificationUrl)
              return (
                <motion.li
                  key={a.id}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-10% 0px' }}
                  transition={{ duration: 0.8, ease: EASE, delay: (i % 3) * 0.07 }}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-ink-2/60 p-6 transition-colors duration-500 hover:border-line-2"
                >
                  <span
                    aria-hidden
                    className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-30"
                    style={{ background: k.color }}
                  />
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid h-11 w-11 place-items-center rounded-xl border" style={{ borderColor: `${k.color}55`, color: k.color }}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-mono text-[11px] text-dim">{yearOf(a.date) || (a.kind === 'Research' ? 'Ongoing' : '')}</span>
                  </div>
                  {img && (
                    <img
                      src={img}
                      alt={a.media?.alt || a.title}
                      loading="lazy"
                      decoding="async"
                      className="mt-5 aspect-video w-full rounded-xl border border-line object-cover"
                    />
                  )}
                  <div className="mt-5 font-mono text-[10px] tracking-widest" style={{ color: k.color }}>
                    {a.kind.toUpperCase()}
                  </div>
                  <h3 className="mt-2 font-display text-xl font-semibold tracking-tight">{a.title}</h3>
                  {a.event && <p className="mt-1 text-sm text-mute">{a.event}</p>}
                  {a.description && <p className="mt-3 text-sm leading-relaxed text-mute">{a.description}</p>}
                  {verify && /^https?:/i.test(verify) && (
                    <a href={verify} target="_blank" rel="noopener" className="mt-auto inline-flex items-center gap-1 pt-5 font-mono text-[11px] text-fg/80 hover:text-cyan">
                      Verify <ArrowUpRight className="h-3 w-3" />
                    </a>
                  )}
                </motion.li>
              )
            })}
          </ul>
        )}

        {certs.length > 0 && (
          <Reveal>
            <div className="mt-16">
              <div className="eyebrow">Certifications</div>
              <ul className="mt-5 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
                {certs.map((c) => {
                  const href = safeHref(c.credentialUrl)
                  const date = fmtYm(c.issueDate)
                  return (
                    <li key={c.id} className="flex items-start gap-4 bg-ink p-5">
                      <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                      <div className="min-w-0 flex-1">
                        <div className="font-display text-base font-medium">{c.name}</div>
                        <div className="mt-0.5 font-mono text-[11px] text-mute">
                          {c.issuer}
                          {date && ` · ${date}`}
                        </div>
                        {c.description && <p className="mt-2 text-xs leading-relaxed text-mute">{c.description}</p>}
                      </div>
                      {href && /^https?:/i.test(href) && (
                        <a href={href} target="_blank" rel="noopener" aria-label={`${c.name} credential`} className="text-mute hover:text-fg">
                          <ArrowUpRight className="h-4 w-4" />
                        </a>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  )
}
