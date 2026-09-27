import { AnimatePresence, motion } from 'framer-motion'
import type { PublicSkill } from '@pg/shared'
import { useMemo, useState } from 'react'
import { useContent } from '../../content/context'
import { headingSize, PAD_DEFAULT, SectionBackdrop, sectionAttrs, useSection } from '../../content/sections'
import { EASE } from '../../lib/motion'
import { Reveal, SectionLabel, SplitHeading } from '../ui/Reveal'

// Technology constellation: each category is a cluster placed on an ellipse;
// its skills orbit the cluster centre. Cross links come from each skill's
// `related` list in the CMS.

const W = 1000
const H = 620
const HEX = /^#[0-9a-f]{6}$/i

interface Placed extends PublicSkill {
  x: number
  y: number
}

function layout(
  skillCategories: string[],
  skills: PublicSkill[],
): { nodes: Placed[]; centers: Record<string, { x: number; y: number }> } {
  const centers: Record<string, { x: number; y: number }> = {}
  skillCategories.forEach((c, i) => {
    const a = (i / skillCategories.length) * Math.PI * 2 - Math.PI / 2
    centers[c] = { x: W / 2 + Math.cos(a) * 320, y: H / 2 + Math.sin(a) * 195 }
  })
  const nodes: Placed[] = []
  skillCategories.forEach((c) => {
    const group = skills.filter((s) => s.category === c)
    group.forEach((s, j) => {
      const a = (j / group.length) * Math.PI * 2 + Math.PI / group.length
      const r = 78 + (j % 2) * 26
      nodes.push({ ...s, x: centers[c].x + Math.cos(a) * r, y: centers[c].y + Math.sin(a) * r * 0.8 })
    })
  })
  return { nodes, centers }
}

export function Skills() {
  const { bundle } = useContent()
  const view = useSection('skills')
  const skills = bundle.skills
  // Categories in CMS order, plus any a skill references that the list lacks.
  const { skillCategories, CAT_COLOR } = useMemo(() => {
    const names: string[] = []
    const colors: Record<string, string> = {}
    bundle.skillCategories.forEach((c) => {
      if (!names.includes(c.name)) names.push(c.name)
      colors[c.name] = HEX.test(c.color) ? c.color : '#8B5CF6'
    })
    skills.forEach((s) => {
      if (!names.includes(s.category)) names.push(s.category)
      colors[s.category] ??= HEX.test(s.categoryColor) ? s.categoryColor : '#8B5CF6'
    })
    return { skillCategories: names.filter((n) => skills.some((s) => s.category === n)), CAT_COLOR: colors }
  }, [bundle.skillCategories, skills])
  const { nodes, centers } = useMemo(() => layout(skillCategories, skills), [skillCategories, skills])
  const [filter, setFilter] = useState<string>('All')
  const [hover, setHover] = useState<string | null>(null)
  const byName = useMemo(() => Object.fromEntries(nodes.map((n) => [n.name, n])), [nodes])

  const links = useMemo(() => {
    const out: [Placed, Placed][] = []
    nodes.forEach((n) => n.related.forEach((l) => byName[l] && byName[l] !== n && out.push([n, byName[l]])))
    return out
  }, [nodes, byName])

  const related = useMemo(() => {
    if (!hover) return null
    const s = new Set([hover])
    links.forEach(([a, b]) => {
      if (a.name === hover) s.add(b.name)
      if (b.name === hover) s.add(a.name)
    })
    return s
  }, [hover, links])

  const visible = (n: PublicSkill) => filter === 'All' || n.category === filter
  const hovered = hover ? byName[hover] : null

  return (
    <section id="skills" className="sec-y relative px-5 sm:px-8" {...sectionAttrs(view, PAD_DEFAULT)}>
      <SectionBackdrop view={view} />
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <SectionLabel index={view.index}>{view.eyebrow || 'Skills'}</SectionLabel>
            <SplitHeading
              text={view.heading || 'A constellation of tools.'}
              className={`mt-8 font-display ${headingSize.lg} font-semibold leading-[0.92] tracking-[-0.04em]`}
            />
          </div>
          <Reveal className="self-end lg:col-span-4 lg:col-start-9">
            <p className="text-[15px] leading-relaxed text-mute">
              {view.description || 'Technologies I have actually used, and where I used them. No made-up percentages.'}
            </p>
          </Reveal>
        </div>

        {/* Category filter */}
        <Reveal>
          <div role="group" aria-label="Filter skills by category" className="mt-14 flex flex-wrap gap-2">
            {['All', ...skillCategories].map((c) => {
              const on = filter === c
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFilter(c)}
                  className={`relative rounded-full border px-4 py-2 font-mono text-[11px] tracking-wide transition-colors ${
                    on ? 'border-transparent text-ink' : 'border-line text-mute hover:border-line-2 hover:text-fg'
                  }`}
                >
                  {on && <motion.span layoutId="skill-filter" className="absolute inset-0 rounded-full bg-fg" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                  <span className="relative flex items-center gap-2">
                    {c !== 'All' && <i className="h-1.5 w-1.5 rounded-full" style={{ background: CAT_COLOR[c] }} />}
                    {c}
                  </span>
                </button>
              )
            })}
          </div>
        </Reveal>

        {/* Constellation (laptop and up) */}
        <Reveal y={40}>
          <div className="relative mt-10 hidden overflow-hidden rounded-[28px] border border-line bg-ink-2/50 lg:block">
            <div className="relative" style={{ aspectRatio: `${W}/${H}` }}>
              <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden>
                <defs>
                  <radialGradient id="sk-halo">
                    <stop offset="0" stopColor="#fff" stopOpacity=".12" />
                    <stop offset="1" stopColor="#fff" stopOpacity="0" />
                  </radialGradient>
                </defs>
                {/* Category spokes */}
                {nodes.map((n) => {
                  const c = centers[n.category]
                  const show = visible(n)
                  return (
                    <line
                      key={'s' + n.id}
                      x1={c.x}
                      y1={c.y}
                      x2={n.x}
                      y2={n.y}
                      stroke={CAT_COLOR[n.category]}
                      strokeOpacity={show ? (related && !related.has(n.name) ? 0.04 : 0.18) : 0.03}
                      style={{ transition: 'stroke-opacity .4s' }}
                    />
                  )
                })}
                {/* Cross links */}
                {links.map(([a, b]) => {
                  const on = related ? related.has(a.name) && related.has(b.name) && (a.name === hover || b.name === hover) : false
                  const show = visible(a) || visible(b)
                  const mx = (a.x + b.x) / 2
                  const my = (a.y + b.y) / 2 - 40
                  return (
                    <path
                      key={a.id + '-' + b.id}
                      d={`M${a.x} ${a.y} Q${mx} ${my} ${b.x} ${b.y}`}
                      fill="none"
                      stroke={on ? '#fff' : 'rgba(255,255,255,.14)'}
                      strokeOpacity={show ? (on ? 0.9 : related ? 0.05 : 0.5) : 0.04}
                      strokeWidth={on ? 1.4 : 0.8}
                      className={on ? 'flow' : ''}
                      style={{ transition: 'stroke-opacity .4s' }}
                    />
                  )
                })}
                {/* Category hubs */}
                {skillCategories.map((c) => (
                  <g key={c} transform={`translate(${centers[c].x} ${centers[c].y})`} opacity={filter === 'All' || filter === c ? 1 : 0.2} style={{ transition: 'opacity .4s' }}>
                    <circle r="46" fill="url(#sk-halo)" />
                    <circle r="4" fill={CAT_COLOR[c]} />
                    <text y="22" textAnchor="middle" fontSize="10" letterSpacing="2" stroke="#0c0d12" strokeWidth="4" paintOrder="stroke" fill={CAT_COLOR[c]} fontFamily="JetBrains Mono, monospace">
                      {c.toUpperCase()}
                    </text>
                  </g>
                ))}
              </svg>

              {nodes.map((n, i) => {
                const show = visible(n)
                const faded = !show || (related !== null && !related.has(n.name))
                return (
                  <motion.button
                    key={n.id}
                    type="button"
                    onPointerEnter={() => setHover(n.name)}
                    onPointerLeave={() => setHover(null)}
                    onFocus={() => setHover(n.name)}
                    onBlur={() => setHover(null)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border px-2.5 py-1 font-mono text-[11px] backdrop-blur"
                    style={{
                      left: `${(n.x / W) * 100}%`,
                      top: `${(n.y / H) * 100}%`,
                      borderColor: hover === n.name ? CAT_COLOR[n.category] : 'rgba(255,255,255,.1)',
                      background: hover === n.name ? 'rgba(16,18,24,.95)' : 'rgba(8,9,13,.75)',
                    }}
                    animate={{
                      opacity: faded ? 0.18 : 1,
                      scale: hover === n.name ? 1.12 : 1,
                      y: [0, i % 2 ? -4 : 4, 0],
                    }}
                    transition={{
                      opacity: { duration: 0.4 },
                      scale: { type: 'spring', stiffness: 400, damping: 25 },
                      y: { duration: 5 + (i % 5), repeat: Infinity, ease: 'easeInOut' },
                    }}
                  >
                    <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: CAT_COLOR[n.category] }} />
                    {n.name}
                  </motion.button>
                )
              })}
            </div>

            {/* Detail readout */}
            <div className="pointer-events-none absolute bottom-5 left-5 w-72 rounded-2xl border border-line bg-ink/90 p-4 backdrop-blur" aria-live="polite">
              <AnimatePresence mode="wait">
                {hovered ? (
                  <motion.div key={hovered.name} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: EASE }}>
                    <div className="font-mono text-[10px] tracking-widest" style={{ color: CAT_COLOR[hovered.category] }}>
                      {hovered.category.toUpperCase()}
                    </div>
                    <div className="mt-1 font-display text-xl font-semibold">{hovered.name}</div>
                    <p className="mt-1 text-xs leading-relaxed text-mute">{hovered.note}</p>
                  </motion.div>
                ) : (
                  <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-mono text-[11px] text-dim">
                    {skills.length} technologies · hover a node
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </Reveal>

        {/* Phones and tablets: clean, touch-friendly grouped list */}
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:hidden">
          {skillCategories
            .filter((c) => filter === 'All' || filter === c)
            .map((c) => (
              <div key={c}>
                <div className="font-mono text-[10px] tracking-widest" style={{ color: CAT_COLOR[c] }}>
                  {c.toUpperCase()}
                </div>
                <ul className="mt-3 space-y-px overflow-hidden rounded-2xl border border-line">
                  {skills
                    .filter((s) => s.category === c)
                    .map((s) => (
                      <li key={s.id} className="bg-ink-2 px-4 py-3">
                        <div className="text-sm font-medium">{s.name}</div>
                        <div className="mt-0.5 text-xs text-mute">{s.note}</div>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
        </div>
      </div>
    </section>
  )
}
