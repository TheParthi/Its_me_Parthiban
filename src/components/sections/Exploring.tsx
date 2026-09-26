import { motion } from 'framer-motion'
import { exploring } from '../../data/profile'
import { EASE } from '../../lib/motion'
import { SectionLabel } from '../ui/Reveal'

export function Exploring() {
  const loop = [...exploring, ...exploring]
  return (
    <section id="exploring" className="relative overflow-hidden border-y border-line py-24 md:py-32">
      {/* Marquee of topics */}
      <div className="relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_10%,#000_90%,transparent)]" aria-hidden>
        <div className="marquee flex shrink-0 gap-12 whitespace-nowrap pr-12 font-display text-[clamp(2.5rem,6vw,5rem)] font-semibold tracking-[-0.03em]">
          {loop.map((e, i) => (
            <span key={i} className={i % 2 ? 'text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,.25)]' : 'text-fg/90'}>
              {e.topic}
              <span className="ml-12 text-cyan">✦</span>
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-20 max-w-7xl px-5 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <SectionLabel index="06">Now</SectionLabel>
            <h2 className="mt-6 font-display text-4xl font-semibold tracking-tight md:text-5xl">Currently Exploring.</h2>
          </div>
          <p className="max-w-sm text-sm text-mute">What I'm studying and building towards next. Ongoing — no made-up completion bars.</p>
        </div>

        {/* A horizontal "learning track": each topic is a station on the line. */}
        <ol className="relative mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {exploring.map((e, i) => (
            <motion.li
              key={e.topic}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-10% 0px' }}
              transition={{ duration: 0.8, ease: EASE, delay: (i % 3) * 0.08 }}
              className="group relative bg-ink p-6 transition-colors duration-500 hover:bg-ink-2"
            >
              <div className="flex items-center gap-3 font-mono text-[10px] tracking-widest text-dim">
                <span className="text-cyan">{String(i + 1).padStart(2, '0')}</span>
                <span className="relative h-px flex-1 overflow-hidden bg-line">
                  <span className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-cyan to-transparent" style={{ animation: `marquee-dot 2.8s ${i * 0.3}s ease-in-out infinite` }} />
                </span>
                <span>IN PROGRESS</span>
              </div>
              <h3 className="mt-5 font-display text-xl font-medium tracking-tight">{e.topic}</h3>
              <p className="mt-2 text-sm leading-relaxed text-mute">{e.note}</p>
            </motion.li>
          ))}
        </ol>
      </div>
      <style>{`@keyframes marquee-dot { 0% { transform: translateX(-100%) } 100% { transform: translateX(300%) } }`}</style>
    </section>
  )
}
