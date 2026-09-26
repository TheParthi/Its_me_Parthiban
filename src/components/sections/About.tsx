import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { about, profile } from '../../data/profile'
import { EASE, useReducedMotion } from '../../lib/motion'
import { Reveal, SectionLabel, SplitHeading } from '../ui/Reveal'

/**
 * Abstract "digital portrait": a dot matrix whose dots swell along
 * interfering waves and bend towards the pointer. Not a photograph.
 */
function SignalPortrait() {
  const ref = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0
    let visible = true
    let running = false
    const pointer = { x: -1, y: -1 }
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      canvas.width = r.width * dpr
      canvas.height = r.height * dpr
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible && !reduced && !running) loop(performance.now())
    })
    io.observe(canvas)

    const move = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      pointer.x = (e.clientX - r.left) / r.width
      pointer.y = (e.clientY - r.top) / r.height
    }
    window.addEventListener('pointermove', move, { passive: true })

    const draw = (t: number) => {
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)
      const cols = 34
      const gap = w / cols
      const rows = Math.floor(h / gap)
      const time = t / 1000
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const u = i / cols
          const v = j / rows
          // Oval "head" mask with a soft edge.
          const dx = (u - 0.5) / 0.36
          const dy = (v - 0.46) / 0.44
          const mask = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy))
          if (mask <= 0.01) continue
          const wave =
            Math.sin(u * 9 + time * 1.2) * 0.5 +
            Math.sin(v * 11 - time * 0.9) * 0.5 +
            Math.sin((u + v) * 7 + time * 0.6)
          const pd = Math.hypot(u - pointer.x, v - pointer.y)
          const lift = Math.max(0, 0.25 - pd) * 5
          const s = (0.35 + 0.35 * (wave / 2 + 0.5) + lift) * mask
          const x = (i + 0.5) * gap
          const y = (j + 0.5) * gap
          const hue = u + lift * 0.3 > 0.55 ? '0,229,255' : '139,92,246'
          ctx.fillStyle = `rgba(${hue},${0.25 + s * 0.75})`
          ctx.beginPath()
          ctx.arc(x, y, Math.max(0.6, s * gap * 0.42), 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    const loop = (t: number) => {
      draw(t)
      running = visible && !reduced
      if (running) raf = requestAnimationFrame(loop)
    }
    loop(performance.now())

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('pointermove', move)
    }
  }, [reduced])

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[28px] border border-line bg-ink-2">
      <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />
      <div className="absolute inset-x-0 top-0 flex justify-between p-5 font-mono text-[10px] tracking-widest text-dim">
        <span>SIGNAL / PORTRAIT</span>
        <span>{profile.initials}-01</span>
      </div>
      <div className="absolute inset-x-0 bottom-0 border-t border-line bg-ink/60 p-5 backdrop-blur">
        <div className="font-display text-lg font-medium">{profile.name}</div>
        <div className="mt-1 font-mono text-[11px] text-mute">{profile.education.degree}</div>
        <div className="font-mono text-[11px] text-dim">{profile.education.school}</div>
      </div>
    </div>
  )
}

export function About() {
  return (
    <section id="about" className="relative px-5 py-32 sm:px-8 md:py-44">
      <div className="mx-auto max-w-7xl">
        <SectionLabel index="01">Identity</SectionLabel>

        <div className="mt-10 grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <SplitHeading
              text={about.heading}
              className="font-display text-[clamp(3rem,8vw,7rem)] font-semibold leading-[0.92] tracking-[-0.04em]"
            />
            <Reveal delay={0.1}>
              <p className="mt-12 font-display text-[clamp(1.4rem,2.5vw,2.1rem)] font-normal leading-[1.3] tracking-tight text-fg/90">
                {about.lead}
              </p>
            </Reveal>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 sm:pl-[12%]">
              {about.paragraphs.map((p, i) => (
                <Reveal key={i} delay={0.15 + i * 0.1}>
                  <p className="text-[15.5px] leading-relaxed text-mute">{p}</p>
                </Reveal>
              ))}
            </div>

            <Reveal delay={0.2}>
              <dl className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
                {about.facts.map((f) => (
                  <div key={f.k} className="bg-ink p-4">
                    <dt className="eyebrow !text-[10px]">{f.k}</dt>
                    <dd className="mt-2 text-[13px] leading-snug text-fg/90">{f.v}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>

          <div className="lg:col-span-4 lg:col-start-9 lg:pt-24">
            <Reveal y={60}>
              <SignalPortrait />
            </Reveal>
          </div>
        </div>

        {/* Engineering philosophy */}
        <div className="mt-28 border-t border-line">
          {about.principles.map((p, i) => (
            <motion.div
              key={p.n}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-10% 0px' }}
              transition={{ duration: 0.9, ease: EASE, delay: i * 0.08 }}
              className="group relative grid grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-2 overflow-hidden border-b border-line py-8 sm:grid-cols-[80px_1fr_1fr] md:py-10"
              tabIndex={0}
            >
              <span className="absolute inset-0 -z-10 origin-left scale-x-0 bg-gradient-to-r from-violet/10 via-cyan/5 to-transparent transition-transform duration-700 ease-out-expo group-hover:scale-x-100 group-focus:scale-x-100" />
              <span className="font-mono text-sm text-cyan">{p.n}</span>
              <h3 className="font-display text-[clamp(2.2rem,5vw,4.5rem)] font-semibold uppercase leading-none tracking-[-0.03em] transition-transform duration-700 ease-out-expo group-hover:translate-x-3">
                {p.title}
              </h3>
              <p className="col-start-2 text-base text-mute sm:col-start-3 sm:text-right sm:text-lg">{p.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
